'use client';

import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Item, ItemContent, ItemDescription, ItemTitle } from '../ui/item';
import type { LanguageListItem } from './index';

export function LanguageRow({
  language,
  selectedLanguageId,
  onSelect,
}: {
  language: LanguageListItem;
  selectedLanguageId: string;
  onSelect: (languageId: string) => void;
}): ReactElement {
  return (
    <Item
      className={cn(
        'yv:hover:bg-muted yv:rounded-[8px] yv:px-4',
        selectedLanguageId === language.id ? 'yv:bg-muted' : '',
      )}
      size="sm"
      role="listitem"
      aria-label={language.display_names?.en}
      asChild
    >
      <Button
        className="yv:w-full yv:h-auto"
        onClick={() => onSelect(language.id)}
        type="button"
        variant="ghost"
      >
        <ItemContent className="yv:flex yv:flex-row yv:justify-between yv:items-center">
          <ItemTitle className="yv:text-start yv:line-clamp-2 yv:truncate yv:min-w-0 yv:max-w-2/3 yv:flex-1">
            <bdi dir="auto">{language.display_names?.en}</bdi>
          </ItemTitle>
          <ItemDescription className="yv:text-end yv:shrink-0 yv:max-w-1/3">
            <bdi dir="auto">{language.display_names?.[language.id]}</bdi>
          </ItemDescription>
        </ItemContent>
      </Button>
    </Item>
  );
}
