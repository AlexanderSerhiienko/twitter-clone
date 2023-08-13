import type {
  GetStaticPropsContext,
  InferGetStaticPropsType,
  NextPage,
} from "next";
import Head from "next/head";
import { ssgHelper } from "~/server/api/ssgHelper";
import { api } from "~/utils/api";
import ErrorPage from "next/error";
import Link from "next/link";
import { IconHoverEffect } from "~/components/IconHoverEffect";
import { VscArrowLeft } from "react-icons/vsc";
import { ProfileImage } from "~/components/ProfileImage";
import { InfiniteTweetList } from "~/components/InfiniteTweetList";
import { useSession } from "next-auth/react";
import { Button } from "~/components/Button";

const prularRules = new Intl.PluralRules();

const getPlural = (number: number, singular: string, plural: string) => {
  return prularRules.select(number) === "one" ? singular : plural;
};

const FollowButton = ({
  isFollowing = false,
  userId,
  onClick,
}: // isLoading = false,
{
  isFollowing?: boolean;
  userId?: string;
  onClick: () => void;
  isLoading?: boolean;
}) => {
  const session = useSession();
  if (session.status !== "authenticated" || session.data.user.id === userId)
    return null;

  return (
    <Button onClick={onClick} small gray={isFollowing}>
      {isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
};

const ProfilePage: NextPage<InferGetStaticPropsType<typeof getStaticProps>> = ({
  id,
}) => {
  const trpcUtils = api.useContext();
  const { data: profile } = api.profile.getById.useQuery({ id });
  const toggleFollow = api.profile.toggleFollow.useMutation({
    onSuccess: ({ addedFollower }) => {
      trpcUtils.profile.getById.setData(
        {
          id,
        },
        (oldData) => {
          if (!oldData) return;

          const countModifier = addedFollower ? 1 : -1;
          return {
            ...oldData,
            isFollowing: addedFollower,
            followersCount: oldData.followersCount + countModifier,
          };
        }
      );
    },
  });
  if (!profile || profile.name) return <ErrorPage statusCode={404} />;

  const tweets = api.tweet.infiniteProfileFeed.useInfiniteQuery(
    { userId: id },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  return (
    <>
      <Head>
        <title>{`Twitter Clone - ${profile.name ?? ""}`}</title>
      </Head>
      <header className="sticky top-0 z-10 flex items-center border-b bg-white px-4 py-2">
        <Link href=".." className="mr-2">
          <IconHoverEffect>
            <VscArrowLeft className="h-6 w-6" />
          </IconHoverEffect>
        </Link>
        <ProfileImage src={profile.image} className="flex-shrink=0 " />
        <div className="ml-2 flex-grow">
          <h1 className="text-lg font-bold">{profile.name}</h1>
          <div className="text-gray-500">
            {profile.tweetsCount}{" "}
            {getPlural(profile.tweetsCount, "Tweet", "Tweets")}{" "}
            {profile.followersCount}{" "}
            {getPlural(profile.followersCount, "Follower", "Followers")}{" "}
            {profile.followsCount} Follows
          </div>
        </div>
        <FollowButton
          isFollowing={profile.isFollowing}
          isLoading={toggleFollow.isLoading}
          userId={id}
          onClick={() => toggleFollow.mutate({ userId: id })}
        />
      </header>
      <main>
        <InfiniteTweetList
          tweets={tweets.data?.pages.flatMap((page) => page.tweets)}
          isError={tweets.isError}
          isLoading={tweets.isLoading}
          hasMore={tweets.hasNextPage}
          fetchNewTweets={tweets.fetchNextPage}
        />
      </main>
    </>
  );
};

export async function getStaticPaths() {
  // ! fix build issue
  const thumb = await Promise.resolve();
  return {
    paths: [],
    fallback: "blocking",
  };
}

export async function getStaticProps(
  context: GetStaticPropsContext<{ id: string }>
) {
  const id = context?.params?.id;
  if (!id) throw new Error("No id provided");

  const ssg = ssgHelper();
  await ssg.profile.getById.prefetch({ id });
  return {
    props: {
      id,
      trpcState: ssg.dehydrate(),
    },
  };
}

export default ProfilePage;
