"use client";

import { Tags } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ActivityCategory } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { ResourceCard } from "../shared/resourse/ResourceCard";
import { ActivityCategoryModal } from "./ActivityCategoryModal";

interface ActivityCategoryCardProps {
  category: ActivityCategory;
  canManage?: boolean;
  onView?: (category: ActivityCategory) => void;
}

export function ActivityCategoryCard({
  category,
  onView,
}: ActivityCategoryCardProps) {
  const [open, setOpen] = useState(false);

  const isArchived = category.status === ActCategoryStatus.ARCHIVED;

  const handleView = () => {
    if (onView) {
      onView(category);
      return;
    }

    setOpen(true);
  };

  return (
    <>
      <ResourceCard
        onClick={handleView}
        icon={<Tags className="size-5" />}
        title={category.name}
        subtitle={
          <Badge variant={isArchived ? "neutral" : "success"} dot>
            {isArchived ? "Archived" : "Active"}
          </Badge>
        }
      />

      {!onView && open && (
        <ActivityCategoryModal
          category={category}
          open
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
