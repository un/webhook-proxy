import { H3Event, getHeader } from "h3";
import { db } from "~/server/db";
import { orgs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
export type OrgContext = {
  id: string;
  slug: string;
  members: {
    id: string;
    userId: string;
  }[];
} | null;

export const validateOrgSlug = async (
  event: H3Event
): Promise<OrgContext | null> => {
  const orgSlug = getHeader(event, "org-slug");
  if (!orgSlug) {
    return null;
  }

  const orgLookupResult = await db.query.orgs.findFirst({
    where: eq(orgs.slug, orgSlug),
    columns: { id: true, name: true, slug: true },
    with: {
      members: {
        columns: {
          id: true,
          userId: true,
        },
      },
    },
  });
  if (!orgLookupResult) {
    return null;
  }

  const orgContext: OrgContext = {
    id: orgLookupResult.id,
    slug: orgLookupResult.slug,
    members: orgLookupResult.members,
  };
  return orgContext;
};
