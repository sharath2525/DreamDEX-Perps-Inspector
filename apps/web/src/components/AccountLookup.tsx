import { useState, type FormEvent } from 'react';
import { getAddress, isAddress } from 'viem';
import { useAccount } from '../app/account-context';
export function AccountLookup() {
  const account = useAccount(); const [input, setInput] = useState(''); const [error, setError] = useState('');
  function submit(event: FormEvent) { event.preventDefault(); if (!isAddress(input)) { setError('Enter a valid public account address.'); return; } setError(''); account.inspect(getAddress(input)); }
  return <form className="panel account-access" onSubmit={submit}><label htmlFor="public-account">Public account</label><div className="input-actions"><input id="public-account" value={input} placeholder={account.owner ?? '0x…'} onChange={event => setInput(event.target.value)} /><button className="button secondary">Inspect account</button></div>{account.owner && <p className="address-line">Selected: {account.owner}</p>}{error && <p role="alert">{error}</p>}</form>;
}
