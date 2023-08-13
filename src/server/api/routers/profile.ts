import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const profileRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input: { id }, ctx }) => {
      const currentUserId = ctx.session?.user.id;
      const profile = await ctx.prisma.user.findUnique({
        where: { id },
        select: {
          name: true,
          image: true,
          _count: {
            select: {
              followers: true,
              follows: true,
              tweets: true,
            },
          },
          followers: !currentUserId
            ? undefined
            : {
                where: { id: currentUserId },
              },
        },
      });
      if (!profile) throw new Error("Profile not found");

      return {
        name: profile.name,
        image: profile.image,
        followersCount: profile._count.followers,
        followsCount: profile._count.follows,
        tweetsCount: profile._count.tweets,
        isFollowing: !!profile.followers?.length,
      };
    }),
  toggleFollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input: { userId }, ctx }) => {
      const currentUserId = ctx.session.user.id;
      const existingFollow = await ctx.prisma.user.findFirst({
        where: {
          id: userId,
          followers: {
            some: { id: currentUserId },
          },
        },
      });

      let addedFollower: boolean;

      if (!existingFollow) {
        await ctx.prisma.user.update({
          where: { id: currentUserId },
          data: {
            followers: {
              connect: { id: userId },
            },
          },
        });
        addedFollower = true;
      } else {
        await ctx.prisma.user.update({
          where: { id: currentUserId },
          data: {
            followers: {
              disconnect: { id: userId },
            },
          },
        });
        addedFollower = false;
      }
      return { addedFollower };
    }),
});
