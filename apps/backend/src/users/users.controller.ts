import {
  Body,
  Controller,
  Delete,
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
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { CurrentUser } from 'src/lib/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { AccessGuard } from 'src/auth/guards';
import { UserRole } from './enums/UserRole.enum';
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { CreateAdminPayloadDto } from './dtos/CreateAdminPayload.dto';
import { Role } from 'src/lib/decorators/user-role.decorator';

@Controller('users')
@UseGuards(AccessGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Serialize(UserResponse)
  @Get('/me')
  getCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.SUPER_ADMIN)
  @Post('/admin')
  @Serialize(UserResponse)
  async createAdmin(
    @Body() createAdminPayloadDto: CreateAdminPayloadDto,
  ): Promise<User> {
    return this.usersService.createAdmin(createAdminPayloadDto);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get()
  @SerializeList(UserResponse)
  async getAllUsersPaginated(@Query() pagination: PaginationQuery) {
    return this.usersService.list(pagination);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get(':id')
  @Serialize(UserResponse)
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponse> {
    return this.usersService.getUserById(id);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post()
  @Serialize(UserResponse)
  async createUser(@Body() body: CreateUserPayload): Promise<UserResponse> {
    return this.usersService.createUser(body);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id')
  @Serialize(UserResponse)
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserPayload,
  ): Promise<UserResponse> {
    return this.usersService.updateUser(id, body);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Delete(':id')
  async deleteUser(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.deleteUser(id);
  }
}
