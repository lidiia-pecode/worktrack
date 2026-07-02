import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual, UUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { hashPassword, scryptAsync } from 'src/lib/utils/hash-password.util';
import { GoogleUserPayload, SignInPayload, SignUpPayload } from '../auth.dto';
import { JwtService } from './jwt.service';
import { AuthContext } from '../auth-strategies/types';
import { AuthSession } from '../entities/AuthSession.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(AuthSession) private Authrepo: Repository<AuthSession>,
    private jwtService: JwtService,
  ) {}

  private async verifyPassword(password: string, hashed: string) {
    const [hashBase64, saltBase64] = hashed.split('$');

    if (!saltBase64 || !hashBase64) return false;

    const salt = Buffer.from(saltBase64, 'base64');
    const expected = Buffer.from(hashBase64, 'base64');

    const provided = await scryptAsync(password, salt, expected.length);

    return timingSafeEqual(provided, expected);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createVerificationCode(email: string) {
    // Тут створюється код верифікації (OTP)
    // і далі кладеться, наприклад в redis, як key-value пара
    // email-у та коду із певним expiration time (напр. 5 хвилин)
    return new Promise<number>((resolve) => {
      resolve(123456);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async verifyCode(email: string, code: number) {
    // Перевіряємо чи є в redis-і для юзера з даним email такий код
    return await Promise.resolve(true);
  }

  public async sendVerificationCode(email: string) {
    const code = await this.createVerificationCode(email);
    // Тут за допомогою якогось провайдера по відправці email-ів
    // відправляється лист з кодом

    return code;
  }

  private hashRefreshToken(token: string) {
    return createHmac('sha256', process.env.REFRESH_TOKEN_HASH_SECRET!)
      .update(token)
      .digest('base64url');
  }

  private verifyRefreshTokenHash(token: string, tokenHash: string) {
    const computed = this.hashRefreshToken(token);

    const a = Buffer.from(computed);
    const b = Buffer.from(tokenHash);

    return a.length === b.length && timingSafeEqual(a, b);
  }

  generateUniqueUsername(base: string): string {
    const normalizedBase = base.toLowerCase().replace(/\s+/g, '');
    return `${normalizedBase}-${randomUUID().slice(0, 8)}`;
  }

  async validateGoogleUser(details: GoogleUserPayload): Promise<User> {
    const { googleId, email, firstName, lastName } = details;

    let user = await this.userRepo.findOne({
      where: { googleId },
    });

    if (user) return user;

    user = await this.userRepo.findOne({
      where: { email },
    });

    if (!user) {
      const baseUsername = `${firstName}_${lastName}`;
      const username = this.generateUniqueUsername(baseUsername);

      user = this.userRepo.create({
        email,
        firstName,
        lastName,
        username,
        googleId,
      });
      await this.userRepo.save(user);

      return user;
    }

    user.googleId = googleId;
    await this.userRepo.save(user);
    return user;
  }

  public async initializeUserSession(user: User) {
    const sessionId = randomUUID();

    const refreshToken = this.jwtService.signRefresh({
      sessionId: sessionId,
      email: user.email,
      id: user.id,
    });

    const refreshHash = this.hashRefreshToken(refreshToken);

    const authSession = this.Authrepo.create({
      id: sessionId,
      userId: user.id,
      refreshHash: refreshHash,
    });

    await this.Authrepo.save(authSession);

    const accessToken = this.jwtService.signAccess({
      id: user.id,
      email: user.email,
      sessionId: sessionId,
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  public async validateLocalUser(data: SignInPayload) {
    const user = await this.userRepo.findOneBy({ email: data.email });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (data.password && user.password) {
      const isEqualPasswords = await this.verifyPassword(
        data.password,
        user.password,
      );

      if (!isEqualPasswords) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    return user;
  }

  public async signup(data: SignUpPayload) {
    // const isValidCode = await this.verifyCode(data.email, data.code);

    // if (!isValidCode) {
    //   throw new UnauthorizedException('Invalid verification code');
    // }

    const isDuplicate = await this.userRepo.existsBy({ email: data.email });
    const isDuplicateUserName = await this.userRepo.existsBy({
      username: data.username,
    });

    if (isDuplicate) {
      throw new BadRequestException('User with this email already exists');
    }

    if (isDuplicateUserName) {
      throw new BadRequestException('User with this username already exists');
    }

    const hashedPassword = await hashPassword(data.password);

    const _user = this.userRepo.create({
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      email: data.email,
      password: hashedPassword,
    });

    const user = await this.userRepo.save(_user);

    return this.initializeUserSession(user);
  }

  public async refreshAccessToken(
    refreshToken: string,
    { user, sessionId }: AuthContext,
  ) {
    console.log('working');
    if (!sessionId) {
      throw new UnauthorizedException();
    }

    const decoded = this.jwtService.verifyRefresh(refreshToken);

    if (decoded.sessionId !== sessionId) {
      throw new UnauthorizedException('Session mismatch');
    }

    const authSession = await this.Authrepo.findOneBy({
      id: sessionId,
    });

    if (!authSession) {
      throw new UnauthorizedException();
    }

    if (authSession.userId !== user.id) {
      throw new UnauthorizedException('Session does not belong to user');
    }

    const isValid = this.verifyRefreshTokenHash(
      refreshToken,
      authSession.refreshHash,
    );

    if (!isValid) {
      await this.Authrepo.delete({ id: sessionId });
      throw new UnauthorizedException();
    }

    const newRefreshToken = this.jwtService.signRefresh({
      sessionId,
      email: user.email,
      id: user.id,
    });
    const newRefreshHash = this.hashRefreshToken(newRefreshToken);

    await this.Authrepo.update(sessionId, { refreshHash: newRefreshHash });

    const accessToken = this.jwtService.signAccess({
      id: user.id,
      email: user.email,
      sessionId,
    });

    return { access_token: accessToken, refresh_token: newRefreshToken };
  }

  public async logout(sessionId: UUID) {
    await this.Authrepo.delete({ id: sessionId });
    return { success: true };
  }

  public async logoutAll(user: User): Promise<{ success: true }> {
    await this.Authrepo.delete({ userId: user.id });
    return { success: true };
  }
}
