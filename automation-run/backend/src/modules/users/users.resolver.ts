import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GraphQLContext } from '../../common/types/request.interface';

@Resolver('User')
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => String)
  async me(@Context() context: GraphQLContext) {
    const user = await this.usersService.findById(context.req.user.sub);
    if (!user) {
      throw new Error('User not found');
    }
    const userAny = user as any;
    const userObj = userAny.toObject ? userAny.toObject() : user;
    const { password, ...result } = userObj;
    return JSON.stringify(result);
  }

  @Query(() => String)
  async userStats(@Context() context: GraphQLContext) {
    const stats = await this.usersService.getUserStats(context.req.user.sub);
    return JSON.stringify(stats);
  }

  @Mutation(() => String)
  async updateProfile(
    @Context() context: GraphQLContext,
    @Args('name', { nullable: true }) name?: string,
  ) {
    const user = await this.usersService.update(context.req.user.sub, { name });
    return JSON.stringify(user);
  }
}
