import BN from 'bn.js'
import { AnyU8a, Codec, ITuple } from '@polkadot/types/types'
import {
  Text,
  UInt,
  Null,
  bool,
  Option,
  Vec,
  BTreeSet,
  BTreeMap,
  Tuple,
  Enum,
  Struct,
  Bytes,
  Raw,
} from '@polkadot/types'
import { AnyMetadataClass } from '@joystream/metadata-protobuf/types'
import { createType } from '@joystream/types'
import { Long } from 'long'
import { Buffer } from 'buffer'

export type EnumVariant<T> = keyof T extends infer K
  ? K extends keyof T
    ? T[K] extends Null | null
      ?
          | K
          | {
              [I in K]: T[I]
            }
      : {
          [I in K]: T[I]
        }
    : never
  : never
type EnumAccessors<T extends string> = {
  [K in `as${T}`]?: unknown
}
type DecoratedEnum<T extends string> = Omit<Enum, 'type'> & {
  type: T
} & EnumAccessors<T>
type CodecOrNull<T> = T extends Codec ? T : Null
type EnumDefs<E extends DecoratedEnum<T>, T extends string> = {
  [K in T]: CodecOrNull<E[`as${K}`]>
}
type StructDefs<S extends Struct> = Omit<S, keyof Struct>
type AsRecord<K, V> = K extends string
  ? Record<K & string, V>
  : K extends number
    ? Record<K & number, V>
    : never

type AsSimpleStruct<T extends Struct> = {
  [K in keyof StructDefs<T>]?: AsSimple<StructDefs<T>[K]>
}

export type AsSimple<T> =
  T extends Option<infer S>
    ? null | undefined | AsSimple<S>
    : T extends DecoratedEnum<infer S>
      ? EnumVariant<{
          [K in keyof EnumDefs<T, S>]: AsSimple<EnumDefs<T, S>[K]>
        }>
      : T extends Struct
        ? AsSimpleStruct<T>
        : T extends Text
          ? string
          : T extends Bytes | Raw
            ? AnyU8a
            : T extends UInt
              ? number | bigint | BN
              : T extends bool
                ? boolean
                : T extends Vec<infer S>
                  ? AsSimple<S>[]
                  : T extends BTreeSet<infer S>
                    ? AsSimple<S>[] | Set<AsSimple<S>>
                    : T extends ITuple<infer S>
                      ? S extends Tuple
                        ? unknown[]
                        : { [K in keyof S]: AsSimple<T[K]> }
                      : T extends BTreeMap<infer K, infer V>
                        ?
                            | Map<AsSimple<K>, AsSimple<V>>
                            | AsRecord<AsSimple<K>, AsSimple<V>>
                        : T extends Null
                          ? null
                          : unknown

export function metaToHex<T>(
  metaClass: AnyMetadataClass<T>,
  obj: T
): `0x${string}` {
  return ('0x' +
    Buffer.from(metaClass.encode(obj).finish()).toString(
      'hex'
    )) as `0x${string}`
}

type MetadataScalar =
  | Long
  | string
  | number
  | boolean
  | Uint8Array
  | null
  | undefined

type RecursiveReplace<T, S, R> = T extends S
  ? R
  : T extends MetadataScalar
    ? T
    : T extends Array<infer I>
      ? Array<RecursiveReplace<I, S, R>>
      : {
          [K in keyof T]: RecursiveReplace<T[K], S, R>
        }

export type MetaInput<IMeta> = RecursiveReplace<IMeta, Long, number | Long>

export function metaToBytes<T>(metaClass: AnyMetadataClass<T>, obj: T): Bytes {
  return createType('Bytes', metaToHex(metaClass, obj))
}
