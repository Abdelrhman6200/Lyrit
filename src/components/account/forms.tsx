"use client";

import { useActionState, useState, useTransition } from "react";
import { changePasswordAction, deleteAddressAction, saveAddressAction, updateProfileAction } from "@/features/customers/account-actions";
import { resendVerificationAction } from "@/features/customers/auth-actions";
import { Field, FormMessage, SubmitButton } from "@/components/forms/fields";

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action] = useActionState(updateProfileAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Email" name="emailDisplay" value={email} disabled readOnly />
      <Field label="Full name" name="name" defaultValue={name} required error={state?.fieldErrors?.name} />
      <Field label="Mobile number" name="phone" type="tel" defaultValue={phone} error={state?.fieldErrors?.phone} />
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Current password" name="current" type="password" autoComplete="current-password" required error={state?.fieldErrors?.current} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" required error={state?.fieldErrors?.password} />
      <SubmitButton pendingLabel="Saving…">Change password</SubmitButton>
    </form>
  );
}

export function ResendVerification() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (msg) return <span className="font-medium">{msg}</span>;
  return (
    <button type="button" className="underline" disabled={pending} onClick={() => start(async () => { const r = await resendVerificationAction(); setMsg(r?.success ?? r?.error ?? "Sent."); })}>
      Resend email
    </button>
  );
}

type Address = { id: string; recipientName: string; phone: string; governorate: string; city: string; street: string; building: string; apartment: string; instructions: string; isDefault: boolean };

function AddressForm({ address, governorates, onDone }: { address?: Address; governorates: string[]; onDone: () => void }) {
  const [state, action] = useActionState(async (prev: Parameters<typeof saveAddressAction>[0], fd: FormData) => {
    const r = await saveAddressAction(prev, fd);
    if (r?.success) onDone();
    return r;
  }, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2" noValidate>
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Recipient name" name="recipientName" defaultValue={address?.recipientName} required error={fe.recipientName} />
      <Field label="Mobile" name="phone" type="tel" defaultValue={address?.phone} required error={fe.phone} />
      <div>
        <label className="label" htmlFor="gov">Governorate</label>
        <select id="gov" name="governorate" className="input" defaultValue={address?.governorate ?? ""} required>
          <option value="">Select…</option>
          {governorates.map((g) => <option key={g}>{g}</option>)}
        </select>
        {fe.governorate && <p className="field-error">{fe.governorate}</p>}
      </div>
      <Field label="City / area" name="city" defaultValue={address?.city} required error={fe.city} />
      <Field className="sm:col-span-2" label="Street address" name="street" defaultValue={address?.street} required error={fe.street} />
      <Field label="Building" name="building" defaultValue={address?.building} />
      <Field label="Floor / apartment" name="apartment" defaultValue={address?.apartment} />
      <Field className="sm:col-span-2" label="Delivery instructions" name="instructions" defaultValue={address?.instructions} />
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="h-4 w-4 accent-forest" /> Default address</label>
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">Save address</SubmitButton>
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

export function AddressBook({ addresses, governorates }: { addresses: Address[]; governorates: string[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div className="space-y-4">
      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="sm:col-span-2"><AddressForm address={a} governorates={governorates} onDone={() => setEditing(null)} /></li>
          ) : (
            <li key={a.id} className="rounded-xl border border-line p-4 text-sm">
              {a.isDefault && <span className="eyebrow">Default</span>}
              <p className="mt-1 font-medium">{a.recipientName}</p>
              <p className="text-muted">{a.street}{a.building && `, ${a.building}`}{a.apartment && `, ${a.apartment}`}<br />{a.city}, {a.governorate}<br />{a.phone}</p>
              <div className="mt-3 flex gap-3">
                <button type="button" className="underline" onClick={() => setEditing(a.id)}>Edit</button>
                <form action={deleteAddressAction}><input type="hidden" name="id" value={a.id} /><button className="text-danger underline">Delete</button></form>
              </div>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? <AddressForm governorates={governorates} onDone={() => setEditing(null)} /> : <button type="button" className="btn-secondary" onClick={() => setEditing("new")}>Add address</button>}
    </div>
  );
}
