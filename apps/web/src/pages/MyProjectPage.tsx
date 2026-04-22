import { Container } from "../components/Container";
import { Meta } from "../components/Meta";
import { Skeleton } from "../components/Skeleton";
import { useHome } from "../data";

export function MyProjectPage() {
  const home = useHome();

  return (
    <>
      <Meta title="My Project" path="/my-project" />

      <section className="relative">
        <div className="h-[72vh] min-h-[520px] w-full overflow-hidden">
          {home.data?.heroImageUrl ? (
            <img
              src={home.data.heroImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-neutral-100" />
          )}
        </div>
        <div className="absolute inset-0">
          <Container className="h-full flex items-end pb-10">
            <div className="max-w-2xl">
              <div className="text-xs text-neutral-600 tracking-wide">
                WINE PROJECT
              </div>
              <h1 className="mt-3 font-serif text-5xl tracking-tighter2 leading-[1.05]">
                Impronta
              </h1>
              {home.isLoading ? (
                <Skeleton className="mt-4 h-6 w-[90%]" />
              ) : home.data?.heroQuote ? (
                <div className="mt-4 text-lg text-neutral-800 leading-relaxed">
                  {home.data.heroQuote}
                </div>
              ) : null}
            </div>
          </Container>
        </div>
      </section>

      <section className="py-16">
        <Container className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="text-xs text-neutral-600 tracking-wide">
              MANIFESTO
            </div>
            <h2 className="mt-3 font-serif text-3xl tracking-tighter2 leading-tight">
              Un ritmo calmo, informazioni chiare.
            </h2>
          </div>

          <div className="md:col-span-2 grid gap-8">
            <div className="card-surface rounded-2xl p-8">
              <div className="text-xs text-neutral-600 tracking-wide">
                STORY
              </div>
              <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                {home.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  home.data?.story
                )}
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="card-surface rounded-2xl p-8">
                <div className="text-xs text-neutral-600 tracking-wide">
                  VISION
                </div>
                <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                  {home.isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    home.data?.vision
                  )}
                </div>
              </div>
              <div className="card-surface rounded-2xl p-8">
                <div className="text-xs text-neutral-600 tracking-wide">
                  MISSION
                </div>
                <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                  {home.isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    home.data?.mission
                  )}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
