import { LucideIcon } from 'lucide-react';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

interface TutorialSectionProps {
  value: string;
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}

export function TutorialSection({ value, icon: Icon, title, children }: TutorialSectionProps) {
  return (
    <AccordionItem value={value} className="border border-border/50 rounded-lg px-4 mb-3 bg-card">
      <AccordionTrigger className="hover:no-underline gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-left font-semibold">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-3 pl-12">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
