import { ref, useContext } from "@nuxtjs/composition-api";
import { EventSourceParserStream } from "eventsource-parser/stream";

type Message = {
  content: string;
  speaker: string;
  runId?: string;
};

// convert readable stream to async iterator in order to support Safari
async function* streamAsyncIterator(stream: ReadableStream) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export function useNlapi() {
  const messageData = ref<string | undefined>();
  const status = ref("");
  const messages = ref<Message[]>([]);
  const isPending = ref<boolean>(false);
  const isError = ref<boolean>(false);
  const threadId = ref<string | undefined>();
  const statusMessage = ref<string | undefined>();

  const controller = ref<AbortController | null>(null);

  const { $auth } = useContext();
  const access_token = ($auth.strategy as any).token?.get();

  function reset() {
    controller.value?.abort();
    isPending.value = false;
    isError.value = false;
    messageData.value = undefined;
    threadId.value = undefined;
    statusMessage.value = undefined;
  }

  async function sendMessage(query: string) {
    isError.value = false;
    isPending.value = true;
    controller.value = new AbortController();
    messageData.value = undefined;

    messages.value = [...messages.value, { content: query, speaker: "human" }];

    try {
      const response = await fetch(window.$nuxt.$config.NLAPI_BASE_URL + "/nlapi/openapi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: access_token,
        },
        body: JSON.stringify({
          user_input: query,
          thread_id: threadId.value,
          options: {
            stream: true,
          },
        }),
        signal: controller.value.signal,
      });

      if (!response.ok) {
        throw new Error("Response was not ok");
      }

      const eventStream = response.body
        ?.pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream());

      if (!eventStream) {
        throw new Error("No event stream");
      }

      for await (const chunk of streamAsyncIterator(eventStream)) {
        if (chunk.event === "status_message") {
          if (status.value !== "processing") {
            status.value = "processing";
          }
          const parsed = JSON.parse(chunk.data);
          statusMessage.value = parsed.content;
          if (threadId.value !== parsed.thread_id) {
            threadId.value = parsed.thread_id;
          }
        } else if (chunk.event === "message_chunk") {
          if (status.value !== "receiving") {
            status.value = "receiving";
          }

          const parsed = JSON.parse(chunk.data);
          if (!messageData.value) messageData.value = "";
          if (isPending.value) {
            isPending.value = false;
          }
          messageData.value = messageData.value + parsed.content;
        } else if (chunk.event === "close") {
          const parsed = JSON.parse(chunk.data);
        }
      }

      if (messageData.value) {
        messages.value = [...messages.value, { content: messageData.value, speaker: "bot" }];
      }

      messageData.value = undefined;
    } catch {
      isPending.value = false;
      isError.value = true;
      messageData.value = undefined;
    }
  }

  return { messages, messageData, sendMessage, reset, isPending, isError };
}
