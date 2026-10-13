import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { getDb } from "./db";
import { foodFeedback, savedItems, userPreferences } from "../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

const profileSchema = z.object({ diet: z.enum(["any", "vegetarian", "vegan", "egg", "non_vegetarian"]), cuisines: z.array(z.string().max(60)).max(12), spice: z.number().min(1).max(3), budget: z.number().min(0).max(10000), allergies: z.array(z.string().max(80)).max(20), excludedIngredients: z.array(z.string().max(80)).max(20), cookingMinutes: z.number().min(5).max(240), difficulty: z.enum(["any", "easy", "medium", "advanced"]), goals: z.array(z.string().max(80)).max(12), mode: z.enum(["cook", "takeaway", "either"]) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select({ profile: userPreferences.profile }).from(userPreferences).where(eq(userPreferences.userId, ctx.user.id)).limit(1);
      return rows[0]?.profile ?? null;
    }),
    save: protectedProcedure.input(profileSchema).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Managed database is not available");
      await db.insert(userPreferences).values({ userId: ctx.user.id, profile: input }).onDuplicateKeyUpdate({ set: { profile: input, updatedAt: new Date() } });
      return { success: true };
    }),
  }),
  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ itemId: savedItems.itemId, kind: savedItems.kind, savedAt: savedItems.savedAt }).from(savedItems).where(eq(savedItems.userId, ctx.user.id)).orderBy(desc(savedItems.savedAt));
    }),
    save: protectedProcedure.input(z.object({ itemId: z.string().min(1).max(100), kind: z.enum(["dish", "recipe"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Managed database is not available");
      await db.insert(savedItems).values({ userId: ctx.user.id, itemId: input.itemId, kind: input.kind }).onDuplicateKeyUpdate({ set: { savedAt: new Date() } });
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ itemId: z.string().min(1).max(100), kind: z.enum(["dish", "recipe"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Managed database is not available");
      await db.delete(savedItems).where(and(eq(savedItems.userId, ctx.user.id), eq(savedItems.itemId, input.itemId), eq(savedItems.kind, input.kind)));
      return { success: true };
    }),
  }),
  feedback: router({
    add: protectedProcedure.input(z.object({ itemId: z.string().min(1).max(100), type: z.enum(["love", "not_for_me", "too_expensive", "too_spicy", "similar"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Managed database is not available");
      await db.insert(foodFeedback).values({ userId: ctx.user.id, itemId: input.itemId, feedback: input.type });
      return { success: true };
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ itemId: foodFeedback.itemId, type: foodFeedback.feedback, createdAt: foodFeedback.createdAt }).from(foodFeedback).where(eq(foodFeedback.userId, ctx.user.id)).orderBy(desc(foodFeedback.createdAt)).limit(100);
    }),
  }),
  account: router({
    clearFoodData: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Managed database is not available");
      await db.delete(foodFeedback).where(eq(foodFeedback.userId, ctx.user.id));
      await db.delete(savedItems).where(eq(savedItems.userId, ctx.user.id));
      await db.delete(userPreferences).where(eq(userPreferences.userId, ctx.user.id));
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
