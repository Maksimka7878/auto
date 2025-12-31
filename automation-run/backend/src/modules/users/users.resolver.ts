import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Resolver('User')
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => String)
  async me(@Context() context) {
    const user = await this.usersService.findById(context.req.user.sub);
    const { password, ...result } = user.toObject();
    return JSON.stringify(result);
  }

  @Query(() => String)
  async userStats(@Context() context) {
    const stats = await this.usersService.getUserStats(context.req.user.sub);
    return JSON.stringify(stats);
  }

  @Mutation(() => String)
  async updateProfile(
    @Context() context,
    @Args('name', { nullable: true }) name?: string,
  ) {
    const user = await this.usersService.update(context.req.user.sub, { name });
    return JSON.stringify(user);
  }
}
