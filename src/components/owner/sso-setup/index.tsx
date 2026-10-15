import { useState } from "react";
import { AlertTriangle, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Single sign-on setup for Houcine.Trades (docs/trades-integration.md). Owner only: it is loaded on demand
// from the owner-only "Private apps" section of /workspace/ecosystem, never from a public page.
// The Ed25519 key pair is generated IN THIS BROWSER with WebCrypto. Nothing is sent anywhere, stored,
// or logged: the keys live only in this component's memory until you hide them or leave the page.
// There is no fallback to a weaker algorithm.

type Keys = { privatePem: string; publicPem: string };

const toPem = (label: string, der: ArrayBuffer) => {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(der)));
  return `-----BEGIN ${label}-----\n${b64.match(/.{1,64}/g)?.join("\n") ?? b64}\n-----END ${label}-----\n`;
};

const generate = async (): Promise<Keys> => {
  if (!window.isSecureContext || !crypto?.subtle) throw new Error("no-webcrypto");
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  return {
    privatePem: toPem("PRIVATE KEY", await crypto.subtle.exportKey("pkcs8", pair.privateKey)),
    publicPem: toPem("PUBLIC KEY", await crypto.subtle.exportKey("spki", pair.publicKey)),
  };
};

const KeyBox = ({ id, label, value, help }: { id: string; label: string; value: string; help: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      (document.getElementById(id) as HTMLTextAreaElement | null)?.select();
    }
  };
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>
      <p className="text-xs text-muted-foreground">{help}</p>
      <textarea
        id={id}
        readOnly
        value={value}
        rows={value.split("\n").length}
        spellCheck={false}
        className="w-full rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground"
      />
      <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-2">
        <Copy className="w-4 h-4" aria-hidden="true" />
        {copied ? "Copied" : `Copy ${label.toLowerCase()}`}
      </Button>
    </div>
  );
};

const SsoSetup = () => {
  const [keys, setKeys] = useState<Keys | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    setUnsupported(false);
    try {
      setKeys(await generate());
    } catch {
      setKeys(null);
      setUnsupported(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-accent" aria-hidden="true" />
          <CardTitle className="text-base">Single sign-on setup</CardTitle>
        </div>
        <CardDescription>
          Creates a new signing key pair in this browser. Nothing is sent anywhere or saved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="rounded-md border border-border p-4 space-y-2" role="note">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Before you start
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>The private key is shown once. Paste it straight into Netlify; never email it, chat it or save it in a file.</li>
            <li>A new key pair replaces the old one: update both Netlify and Houcine.Trades, or sign-on stops working (the plain sign-in page still works).</li>
            <li>Do this on your own computer, with nobody watching the screen.</li>
          </ul>
        </div>

        {!keys && (
          <Button type="button" onClick={create} disabled={busy} className="gap-2">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            {busy ? "Creating…" : "Create a new key pair"}
          </Button>
        )}

        {unsupported && (
          <p className="rounded-md border border-destructive/60 p-4 text-foreground" role="alert">
            This browser cannot create Ed25519 keys, so no key was made (there is no weaker fallback). Open this
            page in a recent version of Chrome, Edge, Firefox or Safari, over https, and try again.
          </p>
        )}

        {keys && (
          <div className="space-y-6">
            <KeyBox
              id="sso-private-key"
              label="Private key"
              value={keys.privatePem}
              help="Netlify → Site configuration → Environment variables → SSO_PRIVATE_KEY (mark it as secret). Keep it nowhere else."
            />
            <KeyBox
              id="sso-public-key"
              label="Public key"
              value={keys.publicPem}
              help="Paste this into the Houcine.Trades settings page. It is safe to share: it can only check signatures."
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => setKeys(null)}>
              I have copied both: hide the keys
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SsoSetup;
