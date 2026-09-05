<script lang="ts">
  import { formatDateInput, parseDateInput } from '../domain/time';

  export let value: string;
  export let label = 'Datum';
  export let caption = 'Datum';
  export let testid: string | undefined = undefined;
  export let large = false;
  export let onchange: (serviceDate: string) => void;

  let displayValue = formatDateInput(value);
  let synchronizedValue = value;
  let invalid = false;

  $: if (value !== synchronizedValue) {
    synchronizedValue = value;
    displayValue = formatDateInput(value);
    invalid = false;
  }

  function commitText(): void {
    const serviceDate = parseDateInput(displayValue);
    if (!serviceDate) {
      invalid = true;
      return;
    }
    invalid = false;
    displayValue = formatDateInput(serviceDate);
    synchronizedValue = serviceDate;
    onchange(serviceDate);
  }

  function chooseDate(event: Event): void {
    const serviceDate = (event.currentTarget as HTMLInputElement).value;
    if (!serviceDate) {
      return;
    }
    displayValue = formatDateInput(serviceDate);
    synchronizedValue = serviceDate;
    invalid = false;
    onchange(serviceDate);
  }
</script>

<div class:large-field={large} class="local-date-field">
  {#if caption}<span>{caption}</span>{/if}
  <div class="local-date-inputs">
    <input
      class="local-date-text"
      aria-label={label}
      aria-invalid={invalid}
      data-testid={testid}
      inputmode="numeric"
      maxlength="10"
      placeholder="TT.MM.JJJJ"
      title={invalid ? 'Bitte ein gültiges Datum als TT.MM.JJJJ eingeben.' : 'Lokales Datumsformat: TT.MM.JJJJ'}
      value={displayValue}
      oninput={(event) => { displayValue = (event.currentTarget as HTMLInputElement).value; invalid = false; }}
      onblur={commitText}
      onkeydown={(event) => { if (event.key === 'Enter') { commitText(); } }}
    />
    <label class="local-date-calendar" aria-label="Kalender öffnen" title={`${label} im Kalender wählen`}>
      <span aria-hidden="true">▦</span>
      <input type="date" value={value} onchange={chooseDate} tabindex="-1" />
    </label>
  </div>
</div>
