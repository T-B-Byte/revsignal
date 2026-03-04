"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateContactDialog } from "./create-contact-dialog";

interface ContactsHeaderProps {
  icpCategories: string[];
}

export function ContactsHeader({ icpCategories }: ContactsHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-text-primary">Contacts</h1>
      <Button onClick={() => setDialogOpen(true)}>+ Add Contact</Button>
      <CreateContactDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        icpCategories={icpCategories}
      />
    </div>
  );
}
