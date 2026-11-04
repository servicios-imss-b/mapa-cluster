
const LOGO_URL = 'https://imssbienestar.gob.mx/assets/img/imb_b.svg';

export function Header() {
  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="IMSS Bienestar"
              className="h-9 w-auto brightness-0 saturate-100 [filter:invert(10%)_sepia(79%)_saturate(665%)_hue-rotate(120deg)_brightness(41%)_contrast(104%)]"
            />
            <div className="leading-none">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Gobierno de Mexico</p>
              <p className="text-sm font-bold tracking-tight text-imss-green">IMSS Bienestar</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
          </div>
        </div>
      </nav>

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-imss-green sm:text-4xl lg:text-5xl">
            Clusters HBC y hospitales ancla
          </h1>
          <p className="mt-2 max-w-xl text-base text-gray-500">
            HBC y hospitales ancla identificados por cluster y ubicación.
          </p>
        </div>
      </div>
    </>
  );
}
