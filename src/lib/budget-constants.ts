// ── Budget category defaults ───────────────────────────────────────────────
// These are universal categories that work across currencies and regions.
// The "Data & Airtime" category was removed as a default — users can add it
// manually if relevant to their context.

export const DEFAULT_CATEGORIES = [
  { name: "Food & Drinks",  emoji: "🍽️" },
  { name: "Transport",      emoji: "🚌" },
  { name: "Education",      emoji: "📚" },
  { name: "Entertainment",  emoji: "🎮" },
  { name: "Personal Care",  emoji: "🧴" },
  { name: "Health",         emoji: "💊" },
  { name: "Clothing",       emoji: "👕" },
  { name: "Utilities",      emoji: "💡" },
  { name: "Subscriptions",  emoji: "🔄" },
  { name: "Savings",        emoji: "💰" },
];

// Additional context-specific categories users can add from the quick-add list
export const EXTRA_CATEGORIES = [
  { name: "Mobile Data",    emoji: "📱" },
  { name: "Rent / Housing", emoji: "🏠" },
  { name: "Groceries",      emoji: "🛒" },
  { name: "Travel",         emoji: "✈️" },
  { name: "Investment",     emoji: "📈" },
  { name: "Gift",           emoji: "🎁" },
];
