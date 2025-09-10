"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

// or wherever you put the type
type checkList = {
    name : boolean;
    age : boolean;
    place : boolean;
}

type Props = {
  status: checkList;                 // current booleans from state
  title?: string;                    // optional title
  className?: string;                // optional extra styles
};

const ITEMS: { key: keyof checkList; label: string }[] = [
  { key: "name",  label: "Name"  },
  { key: "age",   label: "Age"   },
  { key: "place", label: "Place" },
];

export default function ChecklistCard({ status, title = "Checklist", className }: Props) {
  return (
    <div className={`rounded-xl bg-white/90 text-black px-4 py-3 shadow ${className || ""}`}>
      <p className="font-semibold mb-2">{title}</p>

      <ul className="flex gap-2 flex-wrap">
        {ITEMS.map(({ key, label }) => {
          const done = !!status[key];

          return (
            <motion.li
              key={key}
              initial={false}
              animate={{ opacity: done ? 0.55 : 1, scale: done ? 0.98 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="relative"
            >
              <div
                className={[
                  "relative select-none rounded-full border px-3 py-1 text-sm",
                  "pr-7", // room for the check icon
                  done ? "border-gray-400 text-gray-600" : "border-black",
                ].join(" ")}
              >
                {/* “Cut” line across the chip when done */}
                <span
                  className={[
                    "pointer-events-none absolute left-1 right-1 top-1/2 h-[2px] -translate-y-1/2",
                    "rounded bg-black/70 transition-opacity",
                    "-rotate-[10deg]",                  // subtle diagonal “cut”
                    done ? "opacity-90" : "opacity-0",  // show when done
                  ].join(" ")}
                />

                <span className={done ? "line-through" : ""}>{label}</span>

                {/* check icon on the right when done */}
                <span className="absolute right-1 top-1/2 -translate-y-1/2">
                  {done && <Check size={16} />}
                </span>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
