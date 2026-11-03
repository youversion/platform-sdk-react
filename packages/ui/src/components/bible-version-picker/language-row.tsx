'use client';

import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Item, ItemContent, ItemDescription, ItemTitle } from '../ui/item';
import type { LanguageListItem } from './index';

type LanguageRowNames = {
  primary: string;
  secondary?: string;
};

export function languageRowNames(
  language: Pick<LanguageListItem, 'id' | 'display_names'>,
): LanguageRowNames {
  const primary =
    language.display_names?.[language.id] || language.display_names?.en || language.id;
  const english = language.display_names?.en;
  if (!english || english === primary) return { primary };
  return { primary, secondary: english };
}

export function LanguageRow({
  language,
  selectedLanguageId,
  onSelect,
}: {
  language: LanguageListItem;
  selectedLanguageId: string;
  onSelect: (languageId: string) => void;
}): ReactElement {
  const { primary, secondary } = languageRowNames(language);
  const label = secondary ? `${primary} ${secondary}` : primary;

  return (
    <Item
      className={cn(
        'yv:hover:bg-muted yv:rounded-lg yv:px-4 yv:py-3',
        selectedLanguageId === language.id ? 'yv:bg-muted' : '',
      )}
      size="default"
      role="listitem"
      // A listitem does not take its accessible name from its contents.
      aria-label={label}
      asChild
    >
      <Button
        className="yv:h-auto yv:min-h-12 yv:w-full yv:whitespace-normal"
        onClick={() => onSelect(language.id)}
        type="button"
        variant="ghost"
      >
        <ItemContent className="yv:flex yv:min-w-0 yv:flex-row yv:flex-wrap yv:items-baseline yv:justify-start yv:gap-2">
          <ItemTitle className="yv:max-w-full yv:min-w-0 yv:w-auto yv:text-start yv:whitespace-normal yv:text-base! yv:font-normal! yv:leading-[1.25]">
            <bdi dir="auto">{primary}</bdi>
          </ItemTitle>
          {secondary ? (
            <ItemDescription className="yv:max-w-full yv:min-w-0 yv:text-start yv:whitespace-normal yv:text-[11px]! yv:font-medium! yv:leading-4 yv:text-muted-foreground!">
              <bdi dir="auto">{secondary}</bdi>
            </ItemDescription>
          ) : null}
        </ItemContent>
      </Button>
    </Item>
  );
}
