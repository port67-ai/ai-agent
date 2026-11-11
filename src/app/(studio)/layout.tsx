import Link from "next/link";
import { StudioLogo } from "@/components/studio/StudioLogo";
import { Navigation } from "@/components/studio/Navigation";
import "./studio.css";
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="studio">
      <a className="studio-skip" href="#content">
        Skip to content
      </a>
      <Navigation />
      <main id="content">{children}</main>
      <footer className="studio-footer">
        <div className="studio-container">
          <div className="studio-footer-top">
            <Link className="studio-wordmark" href="/">
              <StudioLogo />
              <span>Listen First. Build What Matters.</span>
            </Link>
            <p>
              Better decisions.
              <br />
              Smarter workflows.
              <br />
              Clearer stories.
            </p>
            <div>
              <Link href="/contact/">Discuss a project ↗</Link>
              <Link href="/process/">How we work</Link>
              <Link href="/work/">Selected concepts</Link>
            </div>
          </div>
          <div className="studio-footer-bottom">
            <span>© {new Date().getFullYear()} Port67.ai</span>
            <span>Business design & AI studio</span>
            <div>
              <Link href="/privacy/">Privacy</Link>
              <Link href="/terms/">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
