/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { hash, compare } from 'bcrypt';
import { User } from '@prisma/client';
import { AccessTokenPayload } from './strategies/accessToken.strategy';
import { RefreshTokenPayload } from './strategies/refreshToken.strategy';
import { IAuth } from 'src/models/requests/auth.model';
import { Tokens } from 'src/models/responses/tokens.model';

const daysLater = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(userDate: User & { confirmPassword: string }): Promise<Tokens> {
    const userExists = await this.usersService.findByEmail(userDate.email);
    if (userExists) {
      throw new BadRequestException('User already exists');
    }

    if (userDate.password !== userDate.confirmPassword) {
      throw new BadRequestException(
        'Password doesn"t match the confirm password',
      );
    }

    const hash = await this.hashData(userDate.password);
    const { confirmPassword, ...user } = userDate;
    const newUser = await this.usersService.createUser({
      ...user,
      password: hash,
    });
    const refreshTokenExpiration = new Date();
    refreshTokenExpiration.setTime(
      refreshTokenExpiration.getTime() + daysLater,
    );
    const tokens = await this.getTokens(
      newUser.id,
      newUser.email,
      refreshTokenExpiration,
    );

    await this.updateRefreshToken(
      newUser.id,
      tokens.refreshToken,
      refreshTokenExpiration,
    );

    return tokens;
  }

  async signIn(data: IAuth): Promise<Tokens> {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) throw new BadRequestException('User does not exist');
    const passwordMatches = await compare(data.password, user.password);
    if (!passwordMatches)
      throw new BadRequestException('Password is incorrect');
    const refreshTokenExpiration = new Date();
    refreshTokenExpiration.setTime(
      refreshTokenExpiration.getTime() + daysLater,
    );
    const tokens = await this.getTokens(
      user.id,
      user.email,
      refreshTokenExpiration,
    );
    await this.updateRefreshToken(
      user.id,
      tokens.refreshToken,
      refreshTokenExpiration,
    );
    return tokens;
  }

  async logout(userId: string): Promise<User> {
    return this.usersService.update(userId, {
      refreshToken: null,
      expire_date: null,
    });
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<Tokens> {
    const user = await this.usersService.findByID(userId);
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    const refresh = refreshToken.substring(7);
    const refreshTokenMatches = await compare(refresh, user.refreshToken);
    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');
    const refreshTokenExpiration = new Date();
    refreshTokenExpiration.setTime(
      refreshTokenExpiration.getTime() + daysLater,
    );
    const tokens = await this.getTokens(
      user.id,
      user.email,
      refreshTokenExpiration,
    );
    await this.updateRefreshToken(
      user.id,
      tokens.refreshToken,
      refreshTokenExpiration,
    );
    return tokens;
  }

  hashData(data: string): Promise<string> {
    return hash(data, 10);
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string,
    expDate: Date,
  ): Promise<void> {
    const hashedRefreshToken = await this.hashData(refreshToken);
    await this.usersService.update(userId, {
      refreshToken: hashedRefreshToken,
      expire_date: expDate,
    });
  }

  async getTokens(
    userId: string,
    email: string,
    expDate: Date,
  ): Promise<Tokens> {
    const accessTokenPayload: AccessTokenPayload = {
      sub: userId,
      email,
    };

    const refreshTokenPayload: RefreshTokenPayload = {
      sub: userId,
      email,
      refreshTokenExpiration: expDate,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '60s',
      }),
      this.jwtService.signAsync(refreshTokenPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
