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
import { CurrentUser, Role } from 'src/lib/decorators';
import { User } from './entities/user.entity';
import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { UsersQuery } from './dtos/UsersQuery.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { UserRole } from './enums/UserRole.enum';

@Controller('users')
@UseGuards(AccessGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Serialize(UserResponse)
  @Get('/me')
  async getCurrentUser(@CurrentUser() authUser: AuthUser): Promise<User> {
    return this.usersService.getUserById(authUser.id, authUser.companyId);
  }

  @Serialize(UserResponse)
  @Patch('/me/profile')
  async updateMyProfile(
    @CurrentUser() authUser: AuthUser,
    @Body() body: UpdateProfilePayload,
  ): Promise<User> {
    return this.usersService.updateProfile(
      authUser.id,
      authUser.companyId,
      body,
    );
  }

  @Role(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get()
  @SerializeList(UserResponse)
  async getAllUsersPaginated(
    @CurrentUser() authUser: AuthUser,
    @Query() query: UsersQuery,
  ) {
    return this.usersService.list(authUser.companyId, query);
  }

  @Role(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get(':id')
  @Serialize(UserResponse)
  async getUserById(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<User> {
    return this.usersService.getUserById(id, authUser.companyId);
  }

  @Role(UserRole.ADMIN, UserRole.OWNER)
  @Post()
  @Serialize(UserResponse)
  async createUser(
    @CurrentUser() authUser: AuthUser,
    @Body() body: CreateUserPayload,
  ): Promise<User> {
    return this.usersService.createUser(authUser.companyId, body);
  }

  @Role(UserRole.ADMIN, UserRole.OWNER)
  @Patch(':id')
  @Serialize(UserResponse)
  async updateUser(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserPayload,
  ): Promise<User> {
    return this.usersService.updateUser(
      id,
      authUser.companyId,
      body,
      authUser.role,
    );
  }

  @Role(UserRole.ADMIN, UserRole.OWNER)
  @Patch(':id/archive')
  async archive(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<User> {
    return this.usersService.archive(id, authUser.id, authUser.companyId);
  }

  @Role(UserRole.ADMIN, UserRole.OWNER)
  @Patch(':id/unarchive')
  async unarchive(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<User> {
    return this.usersService.unarchive(id, authUser.companyId);
  }
}
