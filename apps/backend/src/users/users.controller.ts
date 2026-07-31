import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponse } from './dtos/UserResponse.dto';
import { CreateUserPayload, UpdateUserPayload } from './dtos/UserPayload.dto';
import { UpdateProfilePayload } from './dtos/UpdateProfilePayload.dto';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { CurrentUser } from 'src/lib/decorators';
import { User } from './entities/user.entity';
import { AccessGuard } from 'src/auth/guards';
import { UserRole } from './enums/UserRole.enum';
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { Role } from 'src/lib/decorators';
import { UsersQuery } from './dtos/UsersQuery.dto';

@Controller('users')
@UseGuards(AccessGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Serialize(UserResponse)
  @Get('/me')
  getCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  @Serialize(UserResponse)
  @Patch('/me/profile')
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() body: UpdateProfilePayload,
  ): Promise<User> {
    return this.usersService.updateProfile(user.id, body);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @Get()
  @SerializeList(UserResponse)
  async getAllUsersPaginated(@Query() query: UsersQuery) {
    return this.usersService.list(query);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @Get(':id')
  @Serialize(UserResponse)
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponse> {
    return this.usersService.getUserById(id);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @Post()
  @Serialize(UserResponse)
  async createUser(@Body() body: CreateUserPayload): Promise<UserResponse> {
    return this.usersService.createUser(body);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @Patch(':id')
  @Serialize(UserResponse)
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserPayload,
  ): Promise<UserResponse> {
    return this.usersService.updateUser(id, body);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @Patch(':id/archive')
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.archive(id);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @Patch(':id/unarchive')
  unarchive(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.unarchive(id);
  }
}
