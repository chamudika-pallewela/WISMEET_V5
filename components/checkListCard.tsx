"use client";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

// Mortgage triage checklist type
type checkList = {
    asked_if_speaking_to_customer: boolean;
    asked_if_customer_name: boolean;
    asked_if_call_time_okay: boolean;
    asked_purchase_or_remortgage: boolean;
    asked_first_time_buyer_or_home_mover: boolean;
    asked_if_found_property: boolean;
    asked_property_price_range: boolean;
    asked_deposit_amount: boolean;
    asked_outstanding_mortgage_balance: boolean;
    asked_estimated_property_value: boolean;
    asked_current_lender: boolean;
    asked_if_on_fixed_deal_and_end_date: boolean;
    asked_estimated_rental_income: boolean;
    asked_if_property_on_standard_AST: boolean;
    asked_how_many_other_properties: boolean;
    asked_if_properties_are_let: boolean;
    asked_if_customer_married: boolean;
    asked_if_joint_mortgage: boolean;
    asked_customer_age_or_partner_age: boolean;
    asked_if_has_children_and_expenses: boolean;
    asked_customer_nationality: boolean;
    asked_about_visa_duration_or_residency: boolean;
}

type Props = {
  status: checkList;                 // current booleans from state
  title?: string;                    // optional title
  className?: string;                // optional extra styles
};

const ITEMS: { key: keyof checkList; label: string }[] = [
  { key: "asked_if_speaking_to_customer", label: "Speaking to customer" },
  { key: "asked_if_customer_name", label: "Customer name" },
  { key: "asked_if_call_time_okay", label: "Call time okay" },
  { key: "asked_purchase_or_remortgage", label: "Purchase or remortgage" },
  { key: "asked_first_time_buyer_or_home_mover", label: "First time buyer status" },
  { key: "asked_if_found_property", label: "Found property" },
  { key: "asked_property_price_range", label: "Property price range" },
  { key: "asked_deposit_amount", label: "Deposit amount" },
  { key: "asked_outstanding_mortgage_balance", label: "Outstanding mortgage balance" },
  { key: "asked_estimated_property_value", label: "Estimated property value" },
  { key: "asked_current_lender", label: "Current lender" },
  { key: "asked_if_on_fixed_deal_and_end_date", label: "Fixed deal and end date" },
  { key: "asked_estimated_rental_income", label: "Estimated rental income" },
  { key: "asked_if_property_on_standard_AST", label: "Property on standard AST" },
  { key: "asked_how_many_other_properties", label: "Number of other properties" },
  { key: "asked_if_properties_are_let", label: "Properties are let" },
  { key: "asked_if_customer_married", label: "Customer married" },
  { key: "asked_if_joint_mortgage", label: "Joint mortgage" },
  { key: "asked_customer_age_or_partner_age", label: "Customer/partner age" },
  { key: "asked_if_has_children_and_expenses", label: "Children and expenses" },
  { key: "asked_customer_nationality", label: "Customer nationality" },
  { key: "asked_about_visa_duration_or_residency", label: "Visa duration/residency" },
];

export default function ChecklistCard({ status, title = "Mortgage Triage Checklist", className }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter out completed items (asked questions disappear)
  const pendingItems = ITEMS.filter(({ key }) => !status[key]);
  const completedCount = ITEMS.length - pendingItems.length;

  // Limit to showing first 10 items for better UX
  const visibleItems = pendingItems.slice(0, 10);

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
            className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-[60vh] overflow-hidden rounded-xl bg-white/95 backdrop-blur-sm shadow-lg border border-gray-200"
          >
            <div className="px-4 pb-3">
              {pendingItems.length > 0 ? (
                <ul className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-hide scroll-smooth">
                  <AnimatePresence mode="popLayout">
                    {visibleItems.map(({ key, label }, index) => {
                      const done = !!status[key];

                      return (
                        <motion.li
                          key={key}
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
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
                            y: 20,
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
                    {pendingItems.length > 10 && (
                      <motion.li
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="text-center py-2 text-xs text-gray-400 border-t border-gray-200 mt-2"
                      >
                        +{pendingItems.length - 10} more items...
                      </motion.li>
                    )}
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
