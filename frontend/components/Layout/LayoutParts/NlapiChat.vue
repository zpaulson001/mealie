<script lang="ts">
import { ref, Ref, watch } from '@nuxtjs/composition-api';
import { defineComponent } from 'vue';
import { useNlapi } from '~/composables/use-users/use-nlapi';
import SafeMarkdown from '~/components/global/SafeMarkdown.vue';

export default defineComponent({
  components: {
    SafeMarkdown
  },
  setup() {
    const chatOpen: Ref<boolean> = ref(false);
    const queryString: Ref<string> = ref('');
    const scrollMarker: Ref<HTMLDivElement | undefined> = ref();

    const { messages, messageData, sendMessage, reset, isPending, isError } = useNlapi();

    const handleSubmit = (event: Event) => {
      event.preventDefault();
      sendMessage(queryString.value);
      queryString.value = '';
    }


    const handleEnterUp = (event: KeyboardEvent) => {
      if (event.shiftKey || event.ctrlKey) {
        return;
      }
      handleSubmit(event);
    }

    const handleEnterDown = (event: KeyboardEvent) => {
      if (event.shiftKey || event.ctrlKey) {
        return;
      }
      event.preventDefault()
    }

    const scrollToBottom = () => {
      setTimeout(() => scrollMarker.value?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    }

    const handleClose = () => {
      chatOpen.value = false;
      queryString.value = ''
      reset();
    }

    watch(isPending, (newVal) => {
      console.log('isPending changed:', newVal);
      scrollToBottom();
    });

    watch([messages, messageData], () => {
      scrollToBottom();
    });

    return { chatOpen, queryString, handleSubmit, scrollMarker, handleEnterUp, handleEnterDown, scrollToBottom, handleClose, messages, messageData, reset, isPending, isError }
  }
});
</script>

<template>

  <!-- Open Chat Button -->
  <v-btn v-if="!chatOpen" fab color="primary" fixed bottom right @click="chatOpen = true"><v-icon>{{
    $globals.icons.message }}</v-icon>
  </v-btn>

  <!-- Chat Card -->
  <v-card v-else elevation="6" class="chat-card" height="80vh">
    <v-card-title primary-title class="chat-title white--text">
      <div class="headline">NLAPI Chat</div>
      <div>
        <v-btn icon class="theme--dark" @click="chatOpen = false">
          <v-icon>{{ $globals.icons.windowMinimize }}</v-icon>
        </v-btn>
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn icon class="theme--dark" @click="reset" v-on="on">
              <v-icon> {{ $globals.icons.close }}</v-icon>
            </v-btn>
          </template>
          <span>This will clear the current chat history.</span>
        </v-tooltip>
      </div>
    </v-card-title>

    <!-- Chat Window -->
    <v-card-text class="py-4 chat-container">
      <div class="chat-window">
        <div style="display: flex; flex-direction: column;" v-for="(message, index) in messages" :key="index">
          <v-sheet v-if="message.speaker === 'bot'" light class="message">
            <SafeMarkdown :source="message.content" />
          </v-sheet>
          <v-sheet style="align-self:flex-end; white-space: pre-wrap;" v-else color="primary" dark
            class="message pa-4 mb-4">
            {{ message.content }}
          </v-sheet>
        </div>
        <v-progress-circular v-if="isPending" indeterminate color="primary"></v-progress-circular>
        <v-sheet v-if="messageData" class="message" light>
          <SafeMarkdown :source="messageData" />
        </v-sheet>
        <div id="scroll-marker" ref="scrollMarker"></div>
      </div>
    </v-card-text>

    <v-divider />
    <v-card-actions style="padding: 0">
      <form class="form" @submit="handleSubmit">
        <v-textarea v-model="queryString" hide-details class="chat-input" solo full-width
          placeholder="Type here to start chatting with the NLAPI : )" flat auto-grow rows="1"
          @keyup.enter="handleEnterUp" @keydown.enter="handleEnterDown"></v-textarea>
        <v-btn type="submit" large icon class="theme--light send-button">
          <v-icon>{{ $globals.icons.send }}</v-icon>
        </v-btn>
      </form>
    </v-card-actions>
  </v-card>

</template>

<style scoped>
.form {
  display: flex;
  flex: 1;
}

.chat-card {
  position: fixed;
  width: 440px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  min-height: 0;
}

.chat-title {
  background-color: var(--v-primary-base);
  justify-content: space-between;
}

.chat-input {
  padding: 0 !important;
  max-height: 12rem !important;
  overflow-y: auto;
}

.chat-container {
  max-height: 100%;
  align-self: end;
  min-height: 0;
  overflow-y: auto;
}

.chat-window {
  display: grid;
  align-content: end;
}

.send-button {
  align-self: flex-end;
  margin: .5rem;
}

.message {
  border-radius: 4px;
  flex-grow: 0;
}
</style>
