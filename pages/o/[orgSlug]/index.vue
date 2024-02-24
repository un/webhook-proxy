<script setup lang="ts">
const { $trpc } = useNuxtApp();
const orgSlug = useRoute().params.orgSlug as string;

const displayedEndpointNameField = ref<string>("");
const editEndpointNameField = ref<string>("");
const addDestinationModalOpen = ref(false);
const newDestinationName = ref("");
const newDestinationUrl = ref("");

const {
  data: userEndpoints,
  status: userEndpointsStatus,
  refresh: refreshEndpoints,
} = await $trpc.endpoints.getAllEndpoints.useLazyQuery({}, { server: false });

const {
  data: userDestinations,
  status: userDestinationsStatus,
  refresh: refreshDestinations,
} = await $trpc.destinations.getAllDestinations.useLazyQuery(
  {},
  { server: false }
);

async function addNewEndpoint() {
  await $trpc.endpoints.create.mutate({ name: "New Endpoint" });
  refreshEndpoints();
}

function setDisplayedEndpointNameField(id: string, name: string) {
  displayedEndpointNameField.value = id;
  editEndpointNameField.value = name;
}

async function updateEndpointName(id: string) {
  await $trpc.endpoints.renameEndpoint.mutate({
    id: id,
    name: editEndpointNameField.value,
  });
  displayedEndpointNameField.value = "";
  refreshEndpoints();
}

async function addNewDestination() {
  await $trpc.destinations.create.mutate({
    name: newDestinationName.value,
    url: newDestinationUrl.value,
  });
  refreshDestinations();
  addDestinationModalOpen.value = false;
  newDestinationName.value = "";
  newDestinationUrl.value = "";
}
</script>

<template>
  <div class="h-full w-full flex flex-col gap-2 p-8">
    <div class="flex flex-col gap-8 w-full">
      <UCard>
        <template #header>
          <span class="font-display text-3xl">Endpoints</span>
        </template>
        <div v-if="userEndpointsStatus === 'pending'">Loading...</div>
        <div v-if="userEndpointsStatus === 'success'">
          <div class="flex flex-row flex-wrap gap-8 w-full">
            <template v-for="endpoint in userEndpoints">
              <UCard class="w-fit">
                <div class="flex flex-col gap-2 w-full">
                  <div class="flex flex-row justify-between items-center">
                    <div class="flex flex-row gap-4 items-center">
                      <span
                        class="font-medium text-lg cursor-pointer"
                        @click="navigateTo(`/o/${orgSlug}/${endpoint.id}`)"
                        >{{ endpoint.name }}</span
                      >
                      <UInput
                        size="xs"
                        v-if="displayedEndpointNameField === endpoint.id"
                        v-model="editEndpointNameField"
                      />
                      <UButton
                        v-if="displayedEndpointNameField !== endpoint.id"
                        square
                        icon="i-ph-pencil"
                        size="xs"
                        variant="soft"
                        @click="
                          setDisplayedEndpointNameField(
                            endpoint.id,
                            endpoint.name
                          )
                        "
                      />
                      <UButton
                        v-if="displayedEndpointNameField === endpoint.id"
                        square
                        icon="i-ph-floppy-disk"
                        size="xs"
                        variant="outline"
                        color="green"
                        @click="updateEndpointName(endpoint.id)"
                      />
                    </div>
                    <UTooltip
                      :text="`Created At: ${endpoint.createdAt?.toLocaleString()}`"
                    >
                      <span class="text-xs text-gray-500 ml-4">{{
                        endpoint.createdAt?.toLocaleDateString()
                      }}</span>
                    </UTooltip>
                  </div>
                  <UButton
                    size="xs"
                    :label="endpoint.id"
                    class="w-fit cursor-pointer"
                    @click="navigateTo(`/o/${orgSlug}/${endpoint.id}`)"
                  />
                </div>
              </UCard>
            </template>
          </div>
        </div>
        <template #footer>
          <UButton
            label="Add Endpoint"
            icon="i-ph-plus"
            @click="addNewEndpoint"
          />
        </template>
      </UCard>
      <UCard>
        <template #header>
          <span class="font-display text-3xl">Destinations</span>
        </template>
        <div v-if="userDestinationsStatus === 'success'">
          <div class="flex flex-row flex-wrap gap-8 w-full">
            <template v-for="destination in userDestinations">
              <UCard class="w-fit">
                <div class="flex flex-col gap-2 w-full">
                  <div class="flex flex-row justify-between items-center">
                    <div class="flex flex-row gap-4 items-center">
                      <span
                        class="font-medium text-lg cursor-pointer"
                        @click="
                          navigateTo(
                            `/o/${orgSlug}/destination/${destination.id}`
                          )
                        "
                        >{{ destination.name }}</span
                      >
                    </div>
                    <UTooltip
                      :text="`Created At: ${destination.createdAt?.toLocaleString()}`"
                    >
                      <span class="text-xs text-gray-500 ml-4">{{
                        destination.createdAt?.toLocaleDateString()
                      }}</span>
                    </UTooltip>
                  </div>
                  <UButton
                    size="xs"
                    :label="destination.id"
                    class="w-fit cursor-pointer"
                    @click="
                      navigateTo(`/o/${orgSlug}/destination/${destination.id}`)
                    "
                  />
                </div>
              </UCard>
            </template>
          </div>
        </div>
        <template #footer>
          <UButton
            label="Add Destination"
            icon="i-ph-plus"
            @click="addDestinationModalOpen = !addDestinationModalOpen"
          />
        </template>
      </UCard>
    </div>
    <UModal v-model="addDestinationModalOpen">
      <div class="p-4 flex flex-col gap-4">
        <span class="font-display text-3xl">Add Destination</span>
        <span>Name: <UInput label="Name" v-model="newDestinationName" /></span>
        <span>Url: <UInput label="Url" v-model="newDestinationUrl" /></span>
        <UButton label="Add Desination" @click="addNewDestination()" />
      </div>
    </UModal>
    <h1>Organization: {{ orgSlug }}</h1>
  </div>
</template>
