import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTableCreator,
  serial,
  text,
  timestamp,
  varchar,
  jsonb,
  smallint,
} from "drizzle-orm/pg-core";
import { typeIdDataType as publicId } from "../utils/typeid";
import { relations } from "drizzle-orm";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");

export const createTable = pgTableCreator((name) => `unwebhook_${name}`);

export const users = createTable("users", {
  id: serial("id").primaryKey(),
  publicId: publicId("user", "public_id").notNull(),
  githubId: varchar("github_id").notNull().unique(),
  username: varchar("username").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  orgsMemberships: many(orgMembers),
}));

export const sessions = createTable("sessions", {
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const orgs = createTable("orgs", {
  id: serial("id").primaryKey(),
  publicId: publicId("org", "public_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orgRelations = relations(orgs, ({ many }) => ({
  members: many(orgMembers),
  endpoints: many(endpoints),
  destinations: many(destinations),
}));

export const orgInvites = createTable("org_invites", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  token: varchar("token", { length: 16 })
    .notNull()
    .unique()
    .$defaultFn(() => nanoid(16)),
  consumed: boolean("consumed").default(false).notNull(),
  createdBy: integer("created_by").notNull(),
  consumedBy: integer("consumed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orgInviteRelations = relations(orgInvites, ({ one }) => ({
  org: one(orgs, {
    fields: [orgInvites.orgId],
    references: [orgs.id],
  }),
  createdBy: one(users, {
    fields: [orgInvites.createdBy],
    references: [users.id],
  }),
  consumedBy: one(users, {
    fields: [orgInvites.consumedBy],
    references: [users.id],
  }),
}));

export const orgMembers = createTable("org_members", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orgMemberRelations = relations(orgMembers, ({ one }) => ({
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
  org: one(orgs, {
    fields: [orgMembers.orgId],
    references: [orgs.id],
  }),
}));

export const routingStrategyEnum = pgEnum("routing_strategy", ["first", "all"]);

export const endpoints = createTable(
  "endpoints",
  {
    id: serial("id").primaryKey(),
    publicId: publicId("endpoint", "public_id").notNull(),
    orgId: integer("org_id").notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    routingStrategy: routingStrategyEnum("routing_strategy").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (endpoint) => ({
    slugIndex: index("slug_idx").on(endpoint.slug),
  }),
);

export const endpointRelations = relations(endpoints, ({ one, many }) => ({
  org: one(orgs, {
    fields: [endpoints.orgId],
    references: [orgs.id],
  }),
  destinations: many(endpointDestinations),
}));

export const destinations = createTable("destinations", {
  id: serial("id").primaryKey(),
  publicId: publicId("destination", "public_id").notNull(),
  orgId: integer("org_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const destinationRelations = relations(destinations, ({ one, many }) => ({
  org: one(orgs, {
    fields: [destinations.orgId],
    references: [orgs.id],
  }),
  endpoints: many(endpointDestinations),
}));

export const endpointDestinations = createTable("endpoint_destinations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  endpointId: integer("endpoint_id").notNull(),
  destinationId: integer("destination_id").notNull(),
  order: smallint("order").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
});

export const endpointDestinationRelations = relations(endpointDestinations, ({ one }) => ({
  org: one(orgs, {
    fields: [endpointDestinations.orgId],
    references: [orgs.id],
  }),
  endpoint: one(endpoints, {
    fields: [endpointDestinations.endpointId],
    references: [endpoints.id],
  }),
  destination: one(destinations, {
    fields: [endpointDestinations.destinationId],
    references: [destinations.id],
  }),
}));

export const messages = createTable("messages", {
  id: serial("id").primaryKey(),
  publicId: publicId("message", "public_id").notNull(),
  orgId: serial("org_id").notNull(),
  endpointId: serial("endpoint_id").notNull(),
  headers: jsonb("headers").notNull().$type<Record<string, string>>(),
  method: varchar("method").notNull(),
  path: varchar("path").notNull(),
  body: jsonb("body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageRelations = relations(messages, ({ one }) => ({
  org: one(orgs, {
    fields: [messages.orgId],
    references: [orgs.id],
  }),
  endpoint: one(endpoints, {
    fields: [messages.endpointId],
    references: [endpoints.id],
  }),
}));

export const messageDeliveries = createTable("message_deliveries", {
  id: serial("id").primaryKey(),
  publicId: publicId("messageDelivery", "public_id").notNull(),
  orgId: integer("org_id").notNull(),
  messageId: integer("message_id").notNull(),
  destinationId: integer("destination_id").notNull(),
  success: boolean("success").notNull(),
  response: jsonb("response").notNull().$type<{ code: number; content: string }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageDeliveryRelations = relations(messageDeliveries, ({ one }) => ({
  org: one(orgs, {
    fields: [messageDeliveries.orgId],
    references: [orgs.id],
  }),
  message: one(messages, {
    fields: [messageDeliveries.messageId],
    references: [messages.id],
  }),
  destination: one(destinations, {
    fields: [messageDeliveries.destinationId],
    references: [destinations.id],
  }),
}));
