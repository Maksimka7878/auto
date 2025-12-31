import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';

@Resolver('Auth')
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => String)
  async register(
    @Args('email') email: string,
    @Args('password') password: string,
    @Args('name') name: string,
  ) {
    const result = await this.authService.register({ email, password, name });
    return JSON.stringify(result);
  }

  @Mutation(() => String)
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    const result = await this.authService.login({ email, password });
    return JSON.stringify(result);
  }

  @Mutation(() => String)
  async refreshTokens(@Args('refreshToken') refreshToken: string) {
    const result = await this.authService.refreshTokens(refreshToken);
    return JSON.stringify(result);
  }
}
