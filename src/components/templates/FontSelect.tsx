import { Label } from '@/components/ui/label';

const HEADING_FONTS = [
  'Playfair Display', 'Merriweather', 'Lora', 'Cormorant Garamond', 
  'Libre Baskerville', 'Montserrat', 'Raleway', 'DM Serif Display', 
  'Poppins', 'Oswald'
];

const BODY_FONTS = [
  'Inter', 'Open Sans', 'Roboto', 'Lato', 'Source Sans 3', 
  'Nunito', 'Work Sans', 'Karla', 'PT Sans', 'Mulish'
];

interface FontSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: 'heading' | 'body';
}

export function FontSelect({ label, value, onChange, type }: FontSelectProps) {
  const fonts = type === 'heading' ? HEADING_FONTS : BODY_FONTS;

  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        style={{ fontFamily: value }}
      >
        {fonts.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs" style={{ fontFamily: value }}>
        El rápido zorro marrón salta sobre el perro perezoso
      </p>
    </div>
  );
}
