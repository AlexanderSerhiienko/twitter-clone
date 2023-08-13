import { useSession } from "next-auth/react";
import {
  FormEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { api } from "~/utils/api";
import { Button } from "./Button";
import { ProfileImage } from "./ProfileImage";

const updateTextAreaHeight = (textarea?: HTMLTextAreaElement | null) => {
  if (!textarea) return;
  textarea.style.height = "0";
  textarea.style.height = `${textarea.scrollHeight}px`;
};

const Form = () => {
  const session = useSession();
  const [inputValue, setInputValue] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement | null | undefined>(null);
  const trpcUtils = api.useContext();

  const inputRef = useCallback((textArea?: HTMLTextAreaElement | null) => {
    updateTextAreaHeight(textArea);
    textAreaRef.current = textArea;
  }, []);

  useLayoutEffect(() => {
    updateTextAreaHeight(textAreaRef.current);
  }, [inputValue]);

  if (session.status !== "authenticated") return null;

  const createTweet = api.tweet.create.useMutation({
    onSuccess: (newTweet) => {
      const updateData: Parameters<
        typeof trpcUtils.tweet.infiniteFeed.setInfiniteData
      >[1] = (oldData) => {
        if (!oldData || !oldData.pages[0]) return;
        const newCacheTweet = {
          ...newTweet,
          likeCount: 0,
          likedByMe: false,
          user: {
            id: session.data.user.id,
            name: session.data.user.name ?? null,
            image: session.data.user.image ?? null,
          },
        };
        return {
          ...oldData,
          pages: [
            {
              ...oldData.pages[0],
              tweets: [newCacheTweet, ...oldData.pages[0].tweets],
            },
            ...oldData.pages.slice(1),
          ],
        };
      };

      trpcUtils.tweet.infiniteFeed.setInfiniteData({}, updateData);
      setInputValue("");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    createTweet.mutate({ content: inputValue });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 border-b px-4 py-2"
    >
      <div className="flex gap-4">
        <ProfileImage src={session.data.user.image} />
        <textarea
          ref={inputRef}
          style={{ height: 0 }}
          className="flex-grow resize-none overflow-hidden p-4 text-lg outline-none"
          placeholder="What's happening?"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>
      <Button className="self-end">Tweet</Button>
    </form>
  );
};

const NewTweetForm = () => {
  const session = useSession();

  if (session.status !== "authenticated") return null;

  return <Form />;
};

export default NewTweetForm;
