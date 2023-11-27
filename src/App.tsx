import {
  Switch, Match, createSignal, Component, Suspense,
  createResource, Show, For, useContext, ErrorBoundary, createEffect, createMemo, Setter, mapArray
} from 'solid-js'

import sqliteWasm from "wa-sqlite/dist/wa-sqlite-async.wasm?asset"

import { ElectricDatabase, electrify } from 'electric-sql/wa-sqlite'
import { Electric, schema } from './generated/client'
import { authToken } from './auth'
import { genUUID } from 'electric-sql/util'

import { createLiveQuery } from './lib/createLiveQuery'
import { createElectricContext } from './lib/provider'
import { generateRandomClub, generateRandomName, generateRandomValue } from './utils'

const ElectricContext = createElectricContext<Electric>()

// this is different to the react bindings, for some reason useElectric would
// always return undefined if exported from ./lib/provider 
export const useElectric = () => useContext(ElectricContext)


function App() {
  const [electric] = createResource(async () => {
    const db = await ElectricDatabase.init('my.db', sqliteWasm)
    const electric = await electrify(
      db,
      schema,
      {
        auth: {
          token: authToken()
        }
      }
    )
    electric.db.person.sync()
    electric.db.club.sync()
    electric.db.clubperson.sync()

    return electric
  })

  return (
    <>

      <Show when={electric()}>
        <ElectricContext.Provider value={electric()}>
          <ElectricApp />
        </ElectricContext.Provider>
      </Show>
    </>
  )
}

const ElectricApp = () => {
  const [state, setState] = createSignal(0)
  const views = ['People', 'Clubs']

  return (
    <>
      <div class="p-2 flex justify-center gap-2">
        <For each={views}>
          {(item, index) => <button class="text-lg" classList={{ 'underline': state() === index() }}
            onClick={() => setState(index())}>{item}</button>}
        </For>
      </div>
      <Switch>
        <Match when={state() === 0}><PeopleView /></Match>
        <Match when={state() === 1}><ClubView /></Match>
      </Switch>
    </>
  )
}


const PeopleView = () => {
  const { db } = useElectric()!


  // people() is a signal for all the people in the table, ordered by order() and filtered by search()
  const [order, setOrder] = createSignal<'asc' | 'desc'>('asc')
  const [search, setSearch] = createSignal("")
  const [people] = createLiveQuery(() => db.person.liveMany({ orderBy: { name: order() }, where: { name: { contains: search() } } }))

  // createEffect(() => console.log(people()))

  const [person, setPerson] = createSignal<string>("")
  const [personResult] = createLiveQuery(() => db.person.liveFirst({ where: { id: person() } }))


  const newRow = () => {
    db.person.create({
      data: {
        id: genUUID(),
        name: generateRandomName(),
        age: Math.floor(Math.random() * 100)
      }
    })
  }

  const clear = () => {
    db.person.deleteMany()
  }

  let inputRef: HTMLInputElement
  let dialogRef: HTMLDialogElement

  createEffect(() => person() ? dialogRef?.showModal() : dialogRef?.close())

  return (
    <div class="flex flex-col max-w-screen-sm gap-2 p- m-auto">
      <div class="flex justify-between text-sm">
        <div class="flex gap-2 w-48">
          <button onClick={newRow}>add</button>
          <button onClick={clear}>clear</button>
        </div>
        <div class="flex gap-2 ">
          <button classList={{ 'underline': order() === 'asc' }} onClick={() => setOrder(() => 'asc')}>Ascending</button>
          <button classList={{ 'underline': order() === 'desc' }} onClick={() => setOrder(() => 'desc')}>Descending</button>
        </div>
        <input class="p-1 rounded" ref={inputRef!} type="text" placeholder="Search" onInput={() => setSearch(inputRef.value)}></input>
      </div>
      <ErrorBoundary fallback={() => <div>error!</div>}>
        <Show when={people()}>
          <For each={people()}>
            {(item) =>
              <div class="flex justify-between rounded border p-1" onClick={() => setPerson(item.id)}>
                <div class="" >{item.name}</div>
                <div class="" >{item.age}</div>
              </div>
            }
          </For>
          <Show when={person() !== ""}>
            <dialog ref={dialogRef!} onClick={() => setPerson("")} class="p-4 rounded border">
              <div onClick={e => e.stopPropagation()}>
                <PersonView id={person()} />
              </div>
            </dialog>
          </Show>
        </Show>
      </ErrorBoundary>
    </div>
  )
}

const PersonView: Component<{ id: string }> = (props) => {
  const { db } = useElectric()!
  const [person] = createLiveQuery(() => db.person.liveUnique({ where: { id: props.id } }))
  const [clubperson] = createLiveQuery(() => db.clubperson.liveMany({ where: { person_id: props.id } }))
  const [club] = createLiveQuery(() => db.club.liveMany())
  createEffect(() => console.log(clubperson()))
  createEffect(() => console.log(club()))


  const isMember = (club_id:string) => clubperson()?.some(item => item.club_id === club_id)

  const removeMembership = (club_id: string) => db.clubperson.deleteMany({ where: { club_id, person_id : props.id } })

  const createMembership = (club_id: string) => db.clubperson.create({ data: { id: genUUID(), club_id, person_id: props.id } })

  return (
    <div class="flex flex-col gap-2">
      <ErrorBoundary fallback={err => err}>
        <Show when={person()}>
          {p =>
            <>
              <div class="grid grid-cols-2">
                <div>Name:</div>
                <div>{p().name}</div>
                <div>Age:</div>
                <div>{p().age}</div>
              </div>
              <div class="border rounded p-2 grid grid-cols-[1fr_2rem]">
                <For each={club()}>
                  {item =>
                    <>
                      <div>{item.name}</div> 
                      <input class="justify-self-end" onClick={e => {e.preventDefault(); isMember(item.id) ? removeMembership(item.id) : createMembership(item.id)}} type="checkbox" checked={isMember(item.id)} />
                    </>}
                </For>
              </div>
            </>
          }
        </Show>
      </ErrorBoundary>
    </div>
  )

}

const ClubView = () => {
  const { db } = useElectric()!
  const [Clubs] = createLiveQuery(() => db.club.liveMany())

  const addClub = () => {
    db.club.create({
      data: {
        id: genUUID(),
        name: generateRandomClub(),
        age: generateRandomValue()
      }
    })
  }
  return (
    <div class="flex flex-col gap-2 max-w-screen-sm m-auto">
      <div>
        <button onClick={() => addClub()}>add</button>
      </div>
      <ErrorBoundary fallback={err => err}>
        <Show when={Clubs()}>
          <For each={Clubs()} >
            {item =>
              <div class="flex justify-between rounded border p-1" >
                <div class="" >{item.name}</div>
                <div class="" >{item.age}</div>
              </div>
            }
          </For>
        </Show>
      </ErrorBoundary>
    </div>
  )
}

export default App
