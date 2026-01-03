import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { MailService } from './services/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/schemas/user.schema';

export interface TokenPayload {
  sub: string;
  email: string;
  plan: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    plan: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, name } = registerDto;

    // Check if user exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Validate password
    if (password.length < 8) {
      throw new BadRequestException('Пароль должен содержать минимум 8 символов');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      name,
      plan: 'free',
    });

    // Generate verification token and send email
    try {
      const verificationToken = await this.usersService.generateVerificationToken(user._id.toString());
      await this.mailService.sendVerificationEmail(email, name, verificationToken);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      // Don't fail registration if email fails
    }

    // Generate tokens
    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Update last login
    await this.usersService.updateLastLogin(user._id.toString());

    // Generate tokens
    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Недействительный refresh token');
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный текущий пароль');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Новый пароль должен содержать минимум 8 символов');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(userId, hashedPassword);
  }

  private generateTokens(user: User): AuthResponse {
    const payload: TokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      plan: user.plan,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
    };
  }

  // ================= Email Verification =================

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Недействительный или истёкший токен верификации');
    }

    await this.usersService.verifyEmail(user._id.toString());

    // Send welcome email
    try {
      await this.mailService.sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error.message}`);
    }

    return { message: 'Email успешно подтверждён' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return { message: 'Если аккаунт существует, письмо будет отправлено' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email уже подтверждён');
    }

    const verificationToken = await this.usersService.generateVerificationToken(user._id.toString());
    await this.mailService.sendVerificationEmail(email, user.name, verificationToken);

    return { message: 'Письмо с подтверждением отправлено' };
  }

  // ================= Password Reset =================

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return { message: 'Если аккаунт существует, инструкции будут отправлены на email' };
    }

    const resetToken = await this.usersService.generatePasswordResetToken(user._id.toString());
    await this.mailService.sendPasswordResetEmail(email, user.name, resetToken);

    return { message: 'Инструкции по сбросу пароля отправлены на email' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.usersService.findByPasswordResetToken(token);

    if (!user) {
      throw new BadRequestException('Недействительный или истёкший токен сброса пароля');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Пароль должен содержать минимум 8 символов');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.resetPassword(user._id.toString(), hashedPassword);

    return { message: 'Пароль успешно изменён' };
  }
}
