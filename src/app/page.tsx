import { SiteHeader } from "@/components/synthegy/site-header";
import { SiteFooter } from "@/components/synthegy/site-footer";
import { Hero } from "@/components/synthegy/hero";
import { Workflows } from "@/components/synthegy/workflows";
import { Demo } from "@/components/synthegy/demo";
import { CommercialValue } from "@/components/synthegy/commercial-value";
import { UseCases } from "@/components/synthegy/use-cases";
import { Architecture } from "@/components/synthegy/architecture";
import { Deploy } from "@/components/synthegy/deploy";
import { CTA } from "@/components/synthegy/cta";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Workflows />
        <Demo />
        <CommercialValue />
        <UseCases />
        <Architecture />
        <Deploy />
        <CTA />
      </main>
      <SiteFooter />
    </>
  );
}
