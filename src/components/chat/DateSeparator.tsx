import React from 'react';

interface DateSeparatorProps {
  date: string;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex justify-center my-4">
      {/* Theme-aware separator */}
      <span className="bg-pure-white dark:bg-grey-dark text-grey-dark dark:text-grey-mid text-sm font-semibold px-4 py-1 rounded-full shadow-sm">
        {date}
      </span>
    </div>
  );
};