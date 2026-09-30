Put the animator's `qr-buddy.riv` here, then set `NEXT_PUBLIC_BUDDY_RIVE=https://create.myqr.co.nz/rive/qr-buddy.riv`
in Vercel and redeploy. It needs artboard `QR`, state machine `Main` and View Model `Buddy` (see
src/components/buddy and the animator's spec). The browser console lists anything missing. If the file won't
load, the SVG buddy stays.
