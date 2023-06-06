/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import { AccessTokenGuard } from 'src/auth/guards/accessToken.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @Body()
    userData: {
      email: string;
      password: string;
      refreshToken?: string;
      expire_date?: string;
    },
  ) {
    return this.usersService.createUser(userData);
  }

  @UseGuards(AccessTokenGuard)
  @Get()
  async getUserById(@Req() req: Request) {
    console.log(req.user)
    return this.usersService.findByID(req.user['sub']);
  }
}
