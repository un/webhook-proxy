<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import type { HTTPHeaderName } from "h3";
type MessageDeliveries = Awaited<
  ReturnType<typeof $trpc.messages.getMessagesDeliveries.query>
>;
const { $trpc } = useNuxtApp();
const orgSlug = useRoute().params.orgSlug as string;
const endpointId = useRoute().params.endpointId as string;
const config = useRuntimeConfig();

const { copy } = useClipboard();

const showEditEndpointNameField = ref(false);
const editEndpointNameField = ref<string>("");
const showAddDestinationModal = ref(false);
const showEditResponseModal = ref(false);
const showEditRoutingStrategyModal = ref(false);

const routingStrategy = ref<"first" | "all">("first");
const responseCode = ref<number>(200);
const responseContent = ref<string>("ok");
const replayLoading = ref(false);

const activeMessageId = ref<string | null>(null);
const activeMessageDeliveries = ref<MessageDeliveries | null>();

const {
  data: userEndpoint,
  status: userEndpointStatus,
  refresh: refreshEndpoint,
} = await $trpc.endpoints.getEndpoint.useLazyQuery(
  { id: endpointId },
  { server: false }
);
const {
  data: endpointMessages,
  status: endpointMessagesStatus,
  refresh: refreshEndpointMessages,
} = await $trpc.messages.getEndpointMessages.useLazyQuery(
  { endpointId: endpointId },
  { server: false }
);
const {
  data: orgDestinations,
  status: orgDestinationsStatus,
  refresh: refreshOrgDestinations,
  execute: executeOrgDestinations,
} = await $trpc.destinations.getAllDestinations.useLazyQuery(
  {},
  { server: false, immediate: false }
);

watch(userEndpoint, (endpoint) => {
  if (!endpoint) return;
  if (!endpoint.id) {
    navigateTo(`/o/${orgSlug}`);
  }
  if (endpoint.response) {
    responseCode.value = endpoint.response.code;
    responseContent.value = endpoint.response.content;
    routingStrategy.value = endpoint.routingStrategy;
  }
});

watch(endpointMessages, () => {
  if (endpointMessages.value && endpointMessages.value.length > 0)
    activeMessageId.value = endpointMessages.value[0].id;
});

watch(activeMessageId, async () => {
  if (activeMessageId.value) {
    getMessageDeliveries();
  }
});

const selectedOrgDestinationIds = ref<string[]>([]);
const possibleOrgDestinations = ref<{ name: string; id: string }[]>([]);
watch(orgDestinations, () => {
  if (orgDestinations.value) {
    possibleOrgDestinations.value = [...orgDestinations.value];
    selectedOrgDestinationIds.value =
      userEndpoint.value?.destinations.map((d) => d.destination.id) || [];
  }
});

const endpointUrl = computed(() => {
  const protocol = import.meta.dev ? "http" : "https";
  return `${protocol}://${config.public.baseUrl}/endpoint/${endpointId}`;
});

const activeMessage = computed(() => {
  return endpointMessages.value?.find((m) => m.id === activeMessageId.value);
});

const activeMessageHeaders = computed(() => {
  if (!activeMessage.value) return [];
  const tableContent = [];
  // @ts-expect-error have to do some wrangling to get the headers to be a string
  for (const [key, value] of Object.entries(activeMessage.value.headers)) {
    tableContent.push({ key, value });
  }
  return tableContent;
});

const activeMessageBody = computed(() => {
  if (!activeMessage.value) return "";
  if (activeMessage.value.contentType === "application/json") {
    return JSON.stringify(JSON.parse(activeMessage.value.body), null, 2);
  }
  return activeMessage.value.body;
});

const activeMessageContentType = computed(() => {
  if (!activeMessage.value) return "";
  const type = activeMessage.value.contentType.startsWith("application/")
    ? activeMessage.value.contentType.split("/")[1]
    : activeMessage.value.contentType;
  return type;
});

function showEndpointNameField() {
  showEditEndpointNameField.value = true;
  editEndpointNameField.value = userEndpoint.value?.name || "";
}

async function updateEndpointName() {
  if (!userEndpoint.value || !userEndpoint.value.id) return;
  await $trpc.endpoints.renameEndpoint.mutate({
    id: userEndpoint.value.id,
    name: editEndpointNameField.value,
  });
  showEditEndpointNameField.value = false;
  refreshEndpoint();
}

async function setResponse() {
  if (!userEndpoint.value || !userEndpoint.value.id) return;
  await $trpc.endpoints.setEndpointResponse.mutate({
    id: userEndpoint.value.id,
    code: responseCode.value,
    content: responseContent.value,
  });
  showEditResponseModal.value = false;
  userEndpoint.value.response = {
    code: responseCode.value,
    content: responseContent.value,
  };
}

async function setStrategy() {
  if (!userEndpoint.value || !userEndpoint.value.id) return;
  await $trpc.endpoints.setEndpointStrategy.mutate({
    id: userEndpoint.value.id,
    strategy: routingStrategy.value,
  });
  showEditRoutingStrategyModal.value = false;
  userEndpoint.value.routingStrategy = routingStrategy.value;
  refreshEndpoint();
}
async function loadDestinations() {
  showAddDestinationModal.value = true;
  await executeOrgDestinations();
}
async function setDestinations() {
  if (!userEndpoint.value || !userEndpoint.value.id) return;
  await $trpc.endpoints.setEndpointDestinations.mutate({
    id: userEndpoint.value.id,
    destinationIds: selectedOrgDestinationIds.value,
  });
  showAddDestinationModal.value = false;
  refreshEndpoint();
}

async function replayMessage() {
  if (!activeMessage.value) return;
  replayLoading.value = true;
  await $trpc.messages.replayMessage.mutate({
    id: activeMessage.value.id,
    endpointId: endpointId,
  });
  await getMessageDeliveries();
  replayLoading.value = false;
}
async function getMessageDeliveries() {
  if (activeMessageId.value) {
    const { data: messageDeliveries } =
      await $trpc.messages.getMessagesDeliveries.useLazyQuery(
        { messageId: activeMessageId.value },
        { server: false }
      );
    activeMessageDeliveries.value = messageDeliveries.value;
  }
}
</script>

<template>
  <div class="h-full w-full flex flex-col gap-2 p-8">
    <UCard>
      <template #header>
        <div class="grid grid-cols-5 gap-4 content-center">
          <div class="flex flex-row gap-4 items-center min-w-fit col-span-1">
            <UButton
              square
              icon="i-ph-arrow-left"
              variant="soft"
              @click="navigateTo(`/o/${orgSlug}`)"
              class="h-fit"
            />
            <span
              class="font-display text-3xl"
              v-if="userEndpointStatus === 'pending'"
            >
              Loading
            </span>
            <span
              class="font-display text-3xl"
              v-if="userEndpointStatus !== 'pending'"
            >
              {{ userEndpoint?.name }}
            </span>
            <UInput
              v-if="showEditEndpointNameField"
              v-model="editEndpointNameField"
            />
            <UButton
              v-if="!showEditEndpointNameField"
              square
              icon="i-ph-pencil"
              variant="soft"
              @click="showEndpointNameField()"
            />
            <UButton
              v-if="showEditEndpointNameField"
              square
              icon="i-ph-floppy-disk"
              variant="outline"
              color="green"
              @click="updateEndpointName()"
            />
          </div>
          <div class="grid grid-cols-3 items-center col-span-4">
            <UTooltip
              text="Click to copy"
              class="w-fit flex flex-row gap-2 items-center"
            >
              <UButton
                class="w-fit"
                @click="copy(endpointUrl)"
                size="xs"
                :label="endpointUrl"
              />
            </UTooltip>
            <div class="col-span-2 flex flex-col gap-2">
              <div class="flex flex-row gap-4 w-full justify-end">
                <div class="flex flex-row gap-2 items-center">
                  <span class="text-sm text-gray-500">Response: </span>
                  <UTooltip
                    text="Click to edit"
                    class="w-fit flex flex-row gap-2 items-center"
                  >
                    <UButton
                      :label="`Code: ${userEndpoint?.response.code} Content: ${userEndpoint?.response.content}`"
                      color="green"
                      class="cursor-pointer"
                      @click="showEditResponseModal = true"
                    />
                  </UTooltip>
                </div>
                <div class="flex flex-row gap-2 items-center">
                  <span class="text-sm text-gray-500">Rounting: </span>
                  <UTooltip
                    text="Click to edit"
                    class="w-fit flex flex-row gap-2 items-center"
                  >
                    <UButton
                      :label="`${userEndpoint?.routingStrategy.toLocaleUpperCase()}`"
                      color="orange"
                      class="cursor-pointer"
                      @click="showEditRoutingStrategyModal = true"
                    />
                  </UTooltip>
                </div>
              </div>
              <div class="flex flex-row gap-2 items-center w-full justify-end">
                <span class="text-sm text-gray-500">Destinations: </span>
                <div
                  v-for="destination in userEndpoint?.destinations"
                  :key="destination.destination.id"
                >
                  <UButton
                    :label="`[${destination.order}]: ${destination.destination.name}`"
                    color="blue"
                    @click="
                      navigateTo(
                        `/o/${orgSlug}/destination/${destination.destination.id}`
                      )
                    "
                  />
                </div>
                <UButton
                  square
                  icon="i-ph-plus"
                  size="sm"
                  @click="loadDestinations()"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
      <div v-if="userEndpointStatus === 'pending'">Loading...</div>
      <div
        v-if="userEndpointStatus === 'success'"
        class="w-full max-w-full overflow-hidden"
      >
        <div class="grid grid-cols-5 gap-4 divide-x-2 p-1">
          <div class="col-span-1 pr-2">
            <div class="flex flex-col gap-4">
              <div class="flex flex-row gap-4 items-center">
                <span class="text-xl">Messages</span>
                <UButton
                  square
                  icon="i-ph-arrow-clockwise"
                  variant="soft"
                  @click="refreshEndpointMessages()"
                  class="active:ring-green-500 active:ring-2"
                />
              </div>
              <div class="flex flex-col gap-4">
                <div
                  v-if="endpointMessages && endpointMessages.length"
                  v-for="message in endpointMessages"
                  :key="message.id"
                  class="flex flex-row gap-4 items-center cursor-pointer"
                  @click="activeMessageId = message.id"
                >
                  <UCard
                    :class="
                      activeMessageId === message.id
                        ? 'ring-slate-500 ring-1 bg-slate-50'
                        : ''
                    "
                  >
                    <div class="flex flex-col gap-2">
                      <span class="text-sm">{{ message.id }}</span>
                      <span class="text-xs text-gray-500">{{
                        message.createdAt?.toUTCString()
                      }}</span>
                    </div>
                  </UCard>
                </div>
              </div>
            </div>
          </div>
          <div
            class="flex flex-col gap-8 w-full max-w-full col-span-4 p-4"
            v-if="
              !activeMessage || !endpointMessages || !endpointMessages.length
            "
          >
            <span class="text-xl">No messages</span>
          </div>
          <div
            class="flex flex-col gap-8 w-full max-w-full col-span-4 p-0 pl-8"
            v-if="activeMessage && endpointMessages && endpointMessages.length"
          >
            <div class="gap-8 grid grid-cols-3">
              <div class="flex flex-col gap-4 min-w-96 col-span-1">
                <span class="text-xl">Headers</span>
                <div class="max-w-96 overflow-hidden">
                  <UTable
                    :rows="activeMessageHeaders"
                    :ui="{
                      wrapper: {
                        class: 'w-full max-w-full overflow-hidden',
                      },
                      td: {
                        padding: 'p-2',
                      },
                    }"
                  >
                    <template #key-data="{ row }">
                      <span class="min-w-fit h-full top-0">{{ row.key }}</span>
                    </template>
                    <template #value-data="{ row }">
                      <span class="text-wrap break-words break-all">{{
                        row.value
                      }}</span>
                    </template>
                  </UTable>
                </div>
              </div>
              <div class="w-full col-span-2 flex flex-col gap-4">
                <div class="flex flex-row justify-between">
                  <span class="text-xl">Payload</span>
                  <UButton
                    label="Resend to destinations"
                    @click="replayMessage()"
                    :loading="replayLoading"
                    icon="i-ph-arrow-clockwise"
                  />
                </div>
                <div class="relative w-full">
                  <UTooltip
                    text="Copy JSON message"
                    class="absolute top-4 right-4"
                  >
                    <UButton
                      square
                      icon="i-ph-clipboard"
                      variant="soft"
                      @click="copy(activeMessage.body)"
                      class="active:ring-green-500 active:ring-2"
                    />
                  </UTooltip>
                  <Shiki
                    :code="activeMessageBody"
                    :lang="activeMessageContentType"
                    :options="{
                      transformers: [
                        {
                          line(node: any) {
                            this.addClassToHast(node, 'whitespace-normal mb-2');
                          },
                        },
                      ],
                    }"
                    class="break-words whitespace-normal *:p-8 *:rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-4">
              <span class="text-xl">Message Deliveries</span>
              <div
                class="flex flex-row flex-wrap w-full gap-4"
                v-if="activeMessageDeliveries && activeMessageDeliveries.length"
              >
                <template
                  v-for="delivery in activeMessageDeliveries"
                  :key="delivery.id"
                >
                  <UCard>
                    <div class="flex flex-col gap-2">
                      <div class="flex flex-row gap-8">
                        <span class="text-sm">
                          <UTooltip :text="delivery.destination.url">
                            {{ delivery.destination.name }}
                          </UTooltip>
                        </span>
                        <UBadge
                          :color="delivery.success ? 'green' : 'red'"
                          :label="delivery.success ? 'Success' : 'Failed'"
                        />
                      </div>

                      <span class="text-sm">
                        <span class="text-xs text-gray-500">
                          {{ delivery.createdAt?.toLocaleDateString() }} -
                          {{ delivery.createdAt?.toLocaleTimeString() }}
                        </span>
                      </span>
                    </div>
                  </UCard>
                </template>
              </div>
              <div class="flex flex-row flex-wrap w-full" v-else>
                <span>no deliveries</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>
    <UModal v-model="showAddDestinationModal">
      <div class="p-4 flex flex-col gap-4 h-fit overflow-scroll">
        <span class="font-display text-3xl">Set Destinations</span>
        <span>
          Set the destinations for this endpoint. Messages will be sent to all
          destinations in the order they appear
        </span>
        <span v-if="orgDestinationsStatus !== 'success'">Loading</span>
        <USelectMenu
          v-if="orgDestinationsStatus === 'success'"
          v-model="selectedOrgDestinationIds"
          :options="possibleOrgDestinations"
          value-attribute="id"
          option-attribute="name"
          multiple
        />
        <UButton label="Set Destinations" @click="setDestinations()" />
      </div>
    </UModal>
    <UModal v-model="showEditResponseModal">
      <div class="p-4 flex flex-col gap-4">
        <span class="font-display text-3xl">Edit Endpoint Response</span>
        <span>
          Set the response that we'll send back when a webhook is received
        </span>
        <span
          >Code: <UInput label="Code" v-model="responseCode" type="number"
        /></span>
        <span
          >Content: <UInput label="Content" v-model="responseContent"
        /></span>
        <UButton label="Set Response" @click="setResponse()" />
      </div>
    </UModal>
    <UModal v-model="showEditRoutingStrategyModal">
      <div class="p-4 flex flex-col gap-4">
        <span class="font-display text-3xl">Edit Routing Strategy</span>
        <span>
          Route incoming messages to either the first destination in the list,
          or route it to all destinations simultaneously
        </span>
        <span
          >If the first destination is offline when using the "First" strategy,
          the message will be sent to the next destination in the list</span
        >
        <USelect
          v-model="routingStrategy"
          option-attribute="name"
          :options="[
            { name: 'First', value: 'first' },
            { name: 'All', value: 'all' },
          ]"
        />
        <UButton label="Set Strategy" @click="setStrategy()" />
      </div>
    </UModal>
  </div>
</template>

<style scoped>
.line {
  white-space: normal;
}
</style>
