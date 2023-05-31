// Styles
import './VPicker.sass'

// Components
import { VSheet } from '@/components/VSheet'

// Composables
import { makeVSheetProps } from '@/components/VSheet/VSheet'

// Utilities
import { defineComponent, useRender } from '@/util'

export const VPicker = defineComponent({
  name: 'VPicker',

  props: {
    landscape: Boolean,

    ...makeVSheetProps(),
  },

  setup (props, { slots }) {
    useRender(() => (
      <VSheet
        class={[
          'v-picker',
          {
            'v-picker--landscape': props.landscape,
            'v-picker--with-actions': !!slots.actions,
          },
        ]}
      >
        { slots.header ? (
          <div class="v-picker__header">
            { slots.header() }
          </div>
        ) : undefined }

        <div class="v-picker__body">
          { slots.default?.() }
        </div>

        { slots.actions ? (
          <div class="v-picker__actions">
            { slots.actions() }
          </div>
        ) : undefined }
      </VSheet>
    ))

    return {}
  },
})
