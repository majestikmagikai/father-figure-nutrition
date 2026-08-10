import { Handshake, FlaskConical, Award, ShieldCheck, Leaf, FileBadge, ExternalLink } from "lucide-react";
import productsImg from "@/assets/products-trio.webp";

const certifications = [
  {
    icon: ShieldCheck,
    title: "NSF GMP Registered",
    text: "NSF/ANSI 455-2 — meticulous Good Manufacturing Practices, regularly inspected.",
  },
  {
    icon: FileBadge,
    title: "SQF FSC-31 Certified",
    text: "GFSI-benchmarked food safety standard for dietary supplement manufacturing.",
  },
  {
    icon: Award,
    title: "FDA Registered Facility",
    text: "Subject to FDA inspection at any time to meet all current regulations.",
  },
  {
    icon: Leaf,
    title: "WFCFO Organic Certified",
    text: "USDA NOP Accredited certifier — backing our 80% organic standard.",
  },
];

export const PartnershipSection = () => {
  return (
    <section id="partner" className="relative py-24 px-6 bg-card/40 border-y border-border">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs uppercase tracking-widest font-semibold mb-4">
            <Handshake className="h-3.5 w-3.5" />
            Manufacturing Partner
          </div>
          <h2 className="font-display text-4xl md:text-5xl uppercase mb-5 leading-tight">
            Made With <span className="text-gradient-primary">Vitalabs</span>
          </h2>
          <p className="text-muted-foreground mb-6">
            Father Figure Nutrition is proudly manufactured in partnership with{" "}
            <a
              href="https://www.vitalabs.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              Vitalabs, Inc.
            </a>{" "}
            — a U.S.-based, NSF GMP registered, SQF certified, and FDA registered supplement
            manufacturer. With 240+ stock formulas, in-house R&D, and rigorous quality assurance,
            Vitalabs powers the precision behind every Father Figure formula.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {certifications.map((row) => (
              <div key={row.title} className="flex gap-3 items-start">
                <div className="shrink-0 w-9 h-9 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <row.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <div className="font-display uppercase tracking-wide text-sm">{row.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{row.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://www.vitalabs.com/about/seals-and-certifications"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wide hover:bg-primary/90 transition"
            >
              View Certifications <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.vitalabs.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background/50 text-sm font-semibold uppercase tracking-wide hover:bg-background transition"
            >
              Visit Vitalabs <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 opacity-90">
            <img
              src="https://www.vitalabs.com/public/images/nsf_cert.webp"
              alt="NSF GMP Registered"
              loading="lazy"
              className="h-12 w-auto bg-white rounded p-1"
            />
            <img
              src="https://www.vitalabs.com/public/images/sqf_logo.webp"
              alt="SQF Certified"
              loading="lazy"
              className="h-12 w-auto bg-white rounded p-1"
            />
            <img
              src="https://www.vitalabs.com/public/images/fda_reg.webp"
              alt="FDA Registered"
              loading="lazy"
              className="h-12 w-auto bg-white rounded p-1"
            />
            <img
              src="https://www.vitalabs.com/public/images/wfcfo_seal.webp"
              alt="WFCFO Organic Certified"
              loading="lazy"
              className="h-12 w-auto bg-white rounded p-1"
            />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 bg-primary/15 blur-3xl rounded-full" />
          <img
            src={productsImg}
            alt="Father Figure supplement product line manufactured by Vitalabs"
            width={1536}
            height={1024}
            loading="lazy"
            className="relative rounded-2xl shadow-card border border-border w-full"
          />
        </div>
      </div>
    </section>
  );
};
