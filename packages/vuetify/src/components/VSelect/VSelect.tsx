// Styles
import './VSelect.sass'

// Components
import { makeVTextFieldProps } from '@/components/VTextField/VTextField'
import { VCheckboxBtn } from '@/components/VCheckbox'
import { VChip } from '@/components/VChip'
import { VDefaultsProvider } from '@/components/VDefaultsProvider'
import { VDialogTransition } from '@/components/transitions'
import { VList, VListItem } from '@/components/VList'
import { VMenu } from '@/components/VMenu'
import { VTextField } from '@/components/VTextField'
import { VListChildren } from '../VList/VListChildren'

// Composables
import { IconValue } from '@/composables/icons'
import { makeItemsProps, useItems } from '@/composables/items'
import { makeTransitionProps } from '@/composables/transition'
import { forwardRefs } from '@/composables/forwardRefs'
import { useForm } from '@/composables/form'
import { useProxiedModel } from '@/composables/proxiedModel'

// Utility
import { computed, mergeProps, ref } from 'vue'
import { deepEqual, genericComponent, omit, propsFactory, useRender, wrapInArray } from '@/util'

// Types
import type { PropType } from 'vue'
import type { MakeSlots, SlotsToProps } from '@/util'
import type { VInputSlots } from '@/components/VInput/VInput'
import type { VFieldSlots } from '@/components/VField/VField'
import type { InternalItem } from '@/composables/items'

export const makeSelectProps = propsFactory({
  chips: Boolean,
  closableChips: Boolean,
  eager: Boolean,
  hideNoData: Boolean,
  hideSelected: Boolean,
  menu: Boolean,
  menuIcon: {
    type: IconValue,
    default: '$dropdown',
  },
  menuProps: {
    type: Object as PropType<VMenu['$props']>,
  },
  multiple: Boolean,
  noDataText: {
    type: String,
    default: '$vuetify.noDataText',
  },
  openOnClear: Boolean,
  readonly: Boolean,
  valueComparator: {
    type: Function as PropType<typeof deepEqual>,
    default: deepEqual,
  },
}, 'v-select')

type Primitive = string | number | boolean | symbol

type Val <T, ReturnObject extends boolean> = T extends Primitive
  ? T
  : (ReturnObject extends true ? T : any)

type Value <T, ReturnObject extends boolean, Multiple extends boolean> =
  Multiple extends true
    ? readonly Val<T, ReturnObject>[]
    : Val<T, ReturnObject>

export const VSelect = genericComponent<new <
  T,
  ReturnObject extends boolean = false,
  Multiple extends boolean = false,
  V extends Value<T, ReturnObject, Multiple> = Value<T, ReturnObject, Multiple>
>() => {
  $props: {
    items?: readonly T[]
    returnObject?: ReturnObject
    multiple?: Multiple
    modelValue?: V
    'onUpdate:modelValue'?: (val: V) => void
  } & SlotsToProps<
    Omit<VInputSlots & VFieldSlots, 'default'> & MakeSlots<{
      item: [{ item: InternalItem<T>, index: number, props: Record<string, unknown> }]
      chip: [{ item: InternalItem<T>, index: number, props: Record<string, unknown> }]
      selection: [{ item: InternalItem<T>, index: number }]
      'prepend-item': []
      'append-item': []
      'no-data': []
    }>
  >
}>()({
  name: 'VSelect',

  props: {
    ...makeSelectProps(),
    ...makeItemsProps({
      itemProps: true,
    }),
    ...omit(makeVTextFieldProps({
      modelValue: null,
    }), ['validationValue', 'dirty', 'appendInnerIcon']),
    ...makeTransitionProps({ transition: { component: VDialogTransition } }),
  },

  emits: {
    'update:modelValue': (val: any) => true,
    'update:menu': (val: boolean) => true,
  },

  setup (props, { slots }) {
    const vTextFieldRef = ref()
    const vMenuRef = ref<VMenu>()
    const _menu = useProxiedModel(props, 'menu')
    const menu = computed({
      get: () => _menu.value,
      set: v => {
        if (_menu.value && !v && vMenuRef.value?.ΨopenChildren) return
        _menu.value = v
      },
    })
    const { items, transformIn, transformOut } = useItems(props)
    const model = useProxiedModel(
      props,
      'modelValue',
      [],
      v => transformIn(wrapInArray(v)),
      v => {
        const transformed = transformOut(v)
        return props.multiple ? transformed : (transformed[0] ?? null)
      }
    )
    const form = useForm()
    const selections = computed(() => {
      return model.value.map(v => {
        return items.value.find(item => props.valueComparator(item.value, v.value)) || v
      })
    })
    const selected = computed(() => selections.value.map(selection => selection.value))

    const displayItems = computed(() => {
      if (props.hideSelected) {
        return items.value.filter(item => !selections.value.some(s => s === item))
      }
      return items.value
    })

    const listRef = ref<VList>()

    function onClear (e: MouseEvent) {
      if (props.openOnClear) {
        menu.value = true
      }
    }
    function onMousedownControl () {
      if (
        (props.hideNoData && !items.value.length) ||
        props.readonly || form?.isReadonly.value
      ) return

      menu.value = !menu.value
    }
    function onKeydown (e: KeyboardEvent) {
      if (props.readonly || form?.isReadonly.value) return

      if (['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault()
      }

      if (['Enter', 'ArrowDown', ' '].includes(e.key)) {
        menu.value = true
      }

      if (['Escape', 'Tab'].includes(e.key)) {
        menu.value = false
      }

      if (e.key === 'ArrowDown') {
        listRef.value?.focus('next')
      } else if (e.key === 'ArrowUp') {
        listRef.value?.focus('prev')
      } else if (e.key === 'Home') {
        listRef.value?.focus('first')
      } else if (e.key === 'End') {
        listRef.value?.focus('last')
      }
    }
    function select (item: InternalItem<any>) {
      if (props.multiple) {
        const index = selected.value.findIndex(selection => props.valueComparator(selection, item.value))

        if (index === -1) {
          model.value = [...model.value, item]
        } else {
          const value = [...model.value]
          value.splice(index, 1)
          model.value = value
        }
      } else {
        model.value = [item]
        menu.value = false
      }
    }
    function onBlur (e: FocusEvent) {
      if (!listRef.value?.$el.contains(e.relatedTarget as HTMLElement)) {
        menu.value = false
      }
    }
    function onFocusout (e: FocusEvent) {
      if (e.relatedTarget == null) {
        vTextFieldRef.value?.focus()
      }
    }

    useRender(() => {
      const hasChips = !!(props.chips || slots.chip)
      const hasList = !!((!props.hideNoData || displayItems.value.length) || slots.prepend || slots.append || slots['no-data'])
      const [textFieldProps] = VTextField.filterProps(props)

      return (
        <VTextField
          ref={ vTextFieldRef }
          { ...textFieldProps }
          modelValue={ model.value.map(v => v.props.value).join(', ') }
          onUpdate:modelValue={ v => { if (v == null) model.value = [] } }
          validationValue={ model.externalValue }
          dirty={ model.value.length > 0 }
          class={[
            'v-select',
            {
              'v-select--active-menu': menu.value,
              'v-select--chips': !!props.chips,
              [`v-select--${props.multiple ? 'multiple' : 'single'}`]: true,
              'v-select--selected': model.value.length,
            },
          ]}
          appendInnerIcon={ props.menuIcon }
          readonly
          onClick:clear={ onClear }
          onMousedown:control={ onMousedownControl }
          onBlur={ onBlur }
          onKeydown={ onKeydown }
        >
          {{
            ...slots,
            default: () => (
              <>
                <VMenu
                  ref={ vMenuRef }
                  v-model={ menu.value }
                  activator="parent"
                  contentClass="v-select__content"
                  eager={ props.eager }
                  maxHeight={ 310 }
                  openOnClick={ false }
                  closeOnContentClick={ false }
                  transition={ props.transition }
                  { ...props.menuProps }
                >
                  <VList
                    ref={ listRef }
                    selected={ selected.value }
                    selectStrategy={ props.multiple ? 'independent' : 'single-independent' }
                    onMousedown={ (e: MouseEvent) => e.preventDefault() }
                    onFocusout={ onFocusout }
                    opened={ items.value.map(item => item.value) }
                  >
                    { slots['prepend-item']?.() }

                    { hasList && (
                      <VListChildren
                        key="list"
                        items={ items.value }
                        noDataText={ !props.hideNoData ? props.noDataText : undefined }
                      >
                        {{
                          ...slots,
                          item: ({ item, index }) => {
                            const onClick = () => select(item)

                            if (slots.item) return slots.item({ item, props: mergeProps(item.props, { onClick }), index })

                            return (
                              <VListItem
                                key={ index }
                                { ...item.props }
                                onClick={ () => select(item) }
                              >
                                {{
                                  prepend: ({ isSelected }) => props.multiple && !props.hideSelected ? (
                                    <VCheckboxBtn modelValue={ isSelected } ripple={ false } />
                                  ) : undefined,
                                }}
                              </VListItem>
                            )
                          },
                        }}
                      </VListChildren>
                    )}

                    { slots['append-item']?.() }
                  </VList>
                </VMenu>

                { selections.value.map((item, index) => {
                  function onChipClose (e: Event) {
                    e.stopPropagation()
                    e.preventDefault()

                    select(item)
                  }

                  const slotProps = {
                    'onClick:close': onChipClose,
                    modelValue: true,
                    'onUpdate:modelValue': undefined,
                  }

                  return (
                    <div key={ item.value } class="v-select__selection">
                      { hasChips ? (
                        !slots.chip ? (
                          <VChip
                            key="chip"
                            closable={ props.closableChips }
                            size="small"
                            text={ item.title }
                            { ...slotProps }
                          />
                        ) : (
                          <VDefaultsProvider
                            key="chip-defaults"
                            defaults={{
                              VChip: {
                                closable: props.closableChips,
                                size: 'small',
                                text: item.title,
                              },
                            }}
                          >
                            { slots.chip?.({ item, index, props: slotProps }) }
                          </VDefaultsProvider>
                        )
                      ) : (
                        slots.selection?.({ item, index }) ?? (
                          <span class="v-select__selection-text">
                            { item.title }
                            { props.multiple && (index < selections.value.length - 1) && (
                              <span class="v-select__selection-comma">,</span>
                            )}
                          </span>
                        )
                      )}
                    </div>
                  )
                })}
              </>
            ),
          }}
        </VTextField>
      )
    })

    return forwardRefs({
      menu,
      select,
    }, vTextFieldRef)
  },
})

export type VSelect = InstanceType<typeof VSelect>
