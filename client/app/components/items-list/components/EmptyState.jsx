import React from 'react';
import { BigMessage } from '@/components/BigMessage';

// Default "list empty" message for list pages
export default function LoadingState() {
  return (
    <div className="text-center">
      <BigMessage icon="fa-search" message="Sorry, we couldn't find anything." />
    </div>
  );
}
