// "More from myQR": links between every myQR site. `current` hides the site you're on.
const SITES = [
  { id: 'wishcast', name: 'Wishcast', blurb: 'Party apps for the TV', href: 'https://myqr.co.nz' },
  { id: 'ideas', name: 'Party ideas', blurb: '21sts, kids parties, QR photos', href: 'https://myqr.co.nz/ideas' },
  { id: 'signage', name: 'Digital Signage', blurb: 'Specials on your venue’s TVs', href: 'https://digitalsignage.myqr.co.nz' },
  { id: 'resthome', name: 'Resthome TV', blurb: 'Family photos on Nana’s TV', href: 'https://resthome.myqr.co.nz' },
  { id: 'reviews', name: 'Review QR', blurb: 'Google review QR code signs', href: 'https://reviews.myqr.co.nz' },
  { id: 'buddy', name: 'QR Buddy', blurb: 'A digital buddy for little kids', href: 'https://create.myqr.co.nz' },
];

export function MyqrFamily({ current }: { current: string }) {
  return (
    <nav className="myqr-family" aria-label="More from myQR">
      <b>More from myQR</b>
      <div>
        {SITES.filter((s) => s.id !== current).map((s) => (
          <a key={s.id} href={s.href}><span>{s.name}</span><small>{s.blurb}</small></a>
        ))}
      </div>
    </nav>
  );
}
