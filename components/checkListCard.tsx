"use client";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter out completed items
  const pendingItems = ITEMS.filter(({ key }) => !status[key]);
  const completedCount = ITEMS.length - pendingItems.length;

  return (
    <div className={`relative rounded-xl bg-white/90 text-black shadow min-w-[200px] ${className || ""}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          <p className="font-semibold">{title}</p>
          {completedCount > 0 && (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              {completedCount}/{ITEMS.length} completed
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl bg-white/95 backdrop-blur-sm shadow-lg border border-gray-200"
          >
            <div className="px-4 pb-3">
              {pendingItems.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  <AnimatePresence mode="popLayout">
                    {pendingItems.map(({ key, label }, index) => {
                      const done = !!status[key];

                      return (
                        <motion.li
                          key={key}
                          initial={{ opacity: 0, scale: 0.8, y: -20 }}
                          animate={{ 
                            opacity: 1, 
                            scale: 1, 
                            y: 0,
                            transition: {
                              delay: index * 0.1,
                              type: "spring", 
                              stiffness: 300, 
                              damping: 22,
                              duration: 0.4
                            }
                          }}
                          exit={{ 
                            opacity: 0, 
                            scale: 0.8, 
                            y: -20,
                            transition: {
                              delay: index * 0.05,
                              duration: 0.3,
                              ease: "easeInOut"
                            }
                          }}
                          layout
                          className="relative"
                        >
                          <motion.div
                            className={[
                              "relative select-none rounded-full border px-3 py-1 text-sm",
                              "pr-7", // room for the check icon
                              done ? "border-gray-400 text-gray-600" : "border-black",
                            ].join(" ")}
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <span className={done ? "line-through" : ""}>{label}</span>

                            {/* check icon on the right when done */}
                            <span className="absolute right-1 top-1/2 -translate-y-1/2">
                              {done && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ 
                                    type: "spring", 
                                    stiffness: 500, 
                                    damping: 25,
                                    delay: 0.2
                                  }}
                                >
                                  <Check size={16} />
                                </motion.div>
                              )}
                            </span>
                          </motion.div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-4 text-gray-500"
                >
                  <Check size={24} className="mx-auto mb-2 text-green-500" />
                  <p className="text-sm">All items completed! 🎉</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
