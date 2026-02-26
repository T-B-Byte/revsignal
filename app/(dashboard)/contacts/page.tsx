import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "@/types/database";
import Link from "next/link";

export default async function ContactsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("company")
    .order("name");

  const internalContacts = (contacts as Contact[] | null)?.filter(
    (c) => c.is_internal
  );
  const externalContacts = (contacts as Contact[] | null)?.filter(
    (c) => !c.is_internal
  );

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">
        Contacts
      </h1>

      {!contacts || contacts.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-text-muted">
              No contacts yet. Contacts are created when you add them to deals.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {internalContacts && internalContacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {internalContacts.map((contact) => (
                    <div
                      key={contact.contact_id}
                      className="flex items-center justify-between rounded-md border border-border-primary bg-surface-tertiary px-4 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {contact.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {contact.role} — {contact.company}
                        </p>
                      </div>
                      {contact.email && (
                        <span className="text-xs text-text-muted">
                          {contact.email}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {externalContacts && externalContacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>External Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {externalContacts.map((contact) => (
                    <Link
                      key={contact.contact_id}
                      href={`/contacts/${contact.contact_id}`}
                      className="flex items-center justify-between rounded-md border border-border-primary bg-surface-tertiary px-4 py-2 transition-colors hover:border-border-hover"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {contact.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {contact.role ? `${contact.role} — ` : ""}
                          {contact.company}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.icp_category && (
                          <Badge variant="blue">{contact.icp_category}</Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
