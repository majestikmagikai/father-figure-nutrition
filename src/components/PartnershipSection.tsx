import { Handshake, Award, ShieldCheck, Leaf, FileBadge, ExternalLink } from "lucide-react";
import productsImg from "@/assets/products-trio.webp";
import nsfCert from "@/assets/nsf_cert.png";
import sqfLogo from "@/assets/sqf_logo.jpg";
import fdaReg from "@/assets/fda_reg.png";
import wfcfoSeal from "@/assets/wfcfo_seal.png";

const certifications = [
  {
    icon: ShieldCheck,
    title: "NSF GMP Registered",
    text: "NSF/ANSI 455-2: meticulous Good Manufacturing Practices, regularly inspected.",
  },
  {
    icon: FileBadge,
    title: "SQF FSC-31 Certified",
    text: "GFSI-benchmarked food safety standard for dietary supplement manufacturing.",
  },
  {
    icon: Award,
    title: "FDA Registered Facility",
    text: "FDA registered and inspected facility. Every batch meets current federal manufacturing standards.",  },
  {
    icon: Leaf,
    title: "WFCFO Organic Certified",
    text: "USDA NOP Accredited certifier, backing our 80% organic standard.",
  },
];

export const PartnershipSection = () => {
  return (
    <section id="partner" className="relative bg-navy overflow-hidden">
      {/* Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-orange/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top: heading + image */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-12 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs uppercase tracking-widest font-semibold mb-5">
            <Handshake className="h-3.5 w-3.5" />
            Manufacturing Partner
          </div>
          <h2 className="font-display text-5xl md:text-6xl uppercase leading-[0.9] text-white mb-5">
            Made With <span className="text-orange">Vitalabs</span>
          </h2>
          <p className="text-white/60 mb-8 leading-relaxed">
            Father Figure Nutrition is proudly manufactured in partnership with{" "}
            <a href="https://www.vitalabs.com/" target="_blank" rel="noopener noreferrer" className="text-sky hover:underline font-semibold">
              Vitalabs, Inc.
            </a>{" "}
            a U.S.-based, NSF GMP registered, SQF certified, and FDA registered supplement manufacturer. With 240+ stock formulas, in-house R&D, and rigorous quality assurance.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.vitalabs.com/about/seals-and-certifications"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange text-white text-sm font-semibold uppercase tracking-wide hover:opacity-90 transition"
            >
              View Certifications <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.vitalabs.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-white/20 bg-white/5 text-white text-sm font-semibold uppercase tracking-wide hover:bg-orange hover:border-orange transition"
            >
              Visit Vitalabs <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-orange/20 blur-3xl rounded-full pointer-events-none" />
          <img
            src={productsImg}
            alt="Father Figure supplement product line manufactured by Vitalabs"
            width={1536}
            height={1024}
            loading="lazy"
            className="relative rounded-2xl shadow-card border border-white/10 w-full"
          />
        </div>
      </div>

      {/* Cert cards */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pb-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {certifications.map((row) => (
          <div key={row.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-orange/40 transition-all">
            <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-navy border border-orange/30 mb-4">
              <row.icon className="h-5 w-5 text-orange" />
            </div>
            <h3 className="font-display uppercase tracking-wide text-sm text-white mb-1">{row.title}</h3>
            <p className="text-xs text-white/50 leading-relaxed">{row.text}</p>
          </div>
        ))}
      </div>

      {/* Cert logos strip */}
      <div className="relative z-10 border-t border-white/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-6 opacity-70">
          {[
            { src: nsfCert, alt: "NSF GMP Registered", bg: false },
            { src: sqfLogo, alt: "SQF Certified", bg: true },
            { src: fdaReg, alt: "FDA Registered", bg: false },
            { src: wfcfoSeal, alt: "WFCFO Organic Certified", bg: false },
          ].map((img) => (
            <img key={img.alt} src={img.src} alt={img.alt} loading="lazy" className={`h-32 w-auto${img.bg ? " bg-white rounded p-2" : ""}`} />
          ))}
        </div>
      </div>
    </section>
  );
};
