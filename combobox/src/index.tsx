import React from 'react'
import {
  autoUpdate,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  size,
  arrow as floatingUIArrow,
  useFloating,
} from '@floating-ui/react-dom'
import { Primitive } from '@radix-ui/react-primitive'
import { createContext } from '@radix-ui/react-context'
import { useComposedRefs } from '@radix-ui/react-compose-refs'
import { Presence } from '@radix-ui/react-presence'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useLayoutEffect } from '@radix-ui/react-use-layout-effect'
import { Portal as PortalPrimitive } from '@radix-ui/react-portal'
import { DismissableLayer } from '@radix-ui/react-dismissable-layer'
import { RemoveScroll } from 'react-remove-scroll'
import { Slot } from '@radix-ui/react-slot'
import * as ArrowPrimitive from '@radix-ui/react-arrow'
import { useSize } from '@radix-ui/react-use-size'
import { Command, useCommandState } from './Command'

import type { Placement, Middleware } from '@floating-ui/react-dom'

const SIDE_OPTIONS = ['top', 'right', 'bottom', 'left'] as const
const ALIGN_OPTIONS = ['start', 'center', 'end'] as const

type Side = (typeof SIDE_OPTIONS)[number]
type Align = (typeof ALIGN_OPTIONS)[number]

/* -------------------------------------------------------------------------------------------------
 * Combobox
 * -----------------------------------------------------------------------------------------------*/

const COMBOBOX_NAME = 'Combobox'

type ComboboxContextValue = {
  trigger: ComboboxInputElement | null
  onTriggerChange: (trigger: ComboboxInputElement | null) => void
  open: boolean
  onOpen: () => void
  onOpenToggle: () => void
  onClose: () => void
  selected: string | number | undefined
  onSelectedChange: (value?: string | number) => void
  input: string
  onInputChange: (value: string) => void
}

const [ComboboxContextProvider, useComboboxContext] =
  createContext<ComboboxContextValue>(COMBOBOX_NAME)

type ComboboxElement = React.ElementRef<typeof Command>
type CommandProps = React.ComponentPropsWithoutRef<typeof Command>
interface ComboboxProps extends CommandProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  input?: string
  defaultInput?: string
  onInputChange?: (value: string) => void
  selected?: string | number | undefined
  defaultSelected?: string | number | undefined
  onSelectedChange?: (selected: string | number | undefined) => void
}

const Combobox = React.forwardRef<ComboboxElement, ComboboxProps>((props, forwardedRef) => {
  const {
    children,
    open: openProp,
    defaultOpen,
    onOpenChange,
    value,
    defaultValue,
    onValueChange,
    input: inputProp,
    defaultInput,
    onInputChange,
    selected: selectedProp,
    defaultSelected,
    onSelectedChange,
    ...commandProps
  } = props
  const [trigger, setTrigger] = React.useState<ComboboxInputElement | null>(null)
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const [selected = '', setSelected] = useControllableState({
    prop: selectedProp,
    defaultProp: defaultSelected,
    onChange: onSelectedChange,
  })
  const [input = '', setInput] = useControllableState({
    prop: inputProp,
    defaultProp: defaultInput,
    onChange: onInputChange,
  })

  return (
    <ComboboxContextProvider
      trigger={trigger}
      onTriggerChange={setTrigger}
      open={open}
      onOpen={React.useCallback(() => {
        setOpen(true)
      }, [setOpen])}
      onOpenToggle={React.useCallback(() => {
        setOpen((currentOpen) => !currentOpen)
      }, [setOpen])}
      onClose={React.useCallback(() => {
        setOpen(false)
      }, [setOpen])}
      selected={selected}
      onSelectedChange={setSelected}
      input={input}
      onInputChange={setInput}
    >
      <Command
        {...commandProps}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        ref={forwardedRef}
      >
        {children}
      </Command>
    </ComboboxContextProvider>
  )
})

Combobox.displayName = COMBOBOX_NAME

/* -------------------------------------------------------------------------------------------------
 * ComboboxAnchor
 * -----------------------------------------------------------------------------------------------*/

const ANCHOR_NAME = 'ComboboxAnchor'

type ComboboxAnchorElement = React.ElementRef<typeof Primitive.div>
interface ComboboxAnchorProps extends PrimitiveDivProps {}

const ComboboxAnchor = React.forwardRef<ComboboxAnchorElement, ComboboxAnchorProps>(
  (props, forwardedRef) => {
    const context = useComboboxContext(ANCHOR_NAME)
    const composedRefs = useComposedRefs(forwardedRef, context.onTriggerChange)

    return <Primitive.div {...props} ref={composedRefs} />
  },
)

/* -------------------------------------------------------------------------------------------------
 * ComboboxInput
 * -----------------------------------------------------------------------------------------------*/

const INPUT_NAME = 'ComboboxInput'

type ComboboxInputElement = React.ElementRef<typeof Primitive.input>
type PrimitiveInputProps = React.ComponentPropsWithoutRef<typeof Command.Input>
interface ComboboxInputProps extends PrimitiveInputProps {}

const ComboboxInput = React.forwardRef<ComboboxInputElement, ComboboxInputProps>(
  (props, forwardedRef) => {
    const context = useComboboxContext(INPUT_NAME)
    const composedRefs = useComposedRefs(forwardedRef, context.onTriggerChange)

    return (
      <Command.Input
        aria-expanded={context.open}
        {...props}
        ref={composedRefs}
        value={context.input}
        onValueChange={(value) => {
          props.onValueChange?.(value)
          if (value.trim()) context.onOpen()
          context.onInputChange(value)
        }}
        onBlur={context.onClose}
      />
    )
  },
)

ComboboxInput.displayName = INPUT_NAME

/* -------------------------------------------------------------------------------------------------
 * ComboboxPortal
 * -----------------------------------------------------------------------------------------------*/

const PORTAL_NAME = 'PopoverPortal'

type PortalContextValue = { forceMount?: true }
const [PortalProvider, usePortalContext] = createContext<PortalContextValue>(PORTAL_NAME, {
  forceMount: undefined,
})

type PortalProps = React.ComponentPropsWithoutRef<typeof PortalPrimitive>
interface PopoverPortalProps {
  children?: React.ReactNode
  /**
   * A optional different container where the portaled content should be appended.
   */
  container?: PortalProps['container']
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: true
}

const ComboboxPortal = (props: PopoverPortalProps) => {
  const { forceMount, children, container } = props
  const context = useComboboxContext(PORTAL_NAME)

  return (
    <PortalProvider forceMount={forceMount}>
      <Presence present={forceMount || context.open}>
        <PortalPrimitive asChild container={container}>
          {children}
        </PortalPrimitive>
      </Presence>
    </PortalProvider>
  )
}

ComboboxPortal.displayName = PORTAL_NAME

/* -------------------------------------------------------------------------------------------------
 * ComboboxContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = 'ComboboxContent'

type ComboboxContentContextValue = {
  placedSide: Side
  onArrowChange: (arrow: HTMLSpanElement | null) => void
  arrowX?: number
  arrowY?: number
  shouldHideArrow: boolean
}

const [ComboboxContentContextProvider, useComboboxContentContext] =
  createContext<ComboboxContentContextValue>(CONTENT_NAME)

type ComboboxContentElement = ComboboxContentImplElement
interface ComboboxContentProps extends ComboboxContentImplProps {
  forceMount?: true
}

const ComboboxContent = React.forwardRef<ComboboxContentElement, ComboboxContentProps>(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(CONTENT_NAME)
    const { forceMount = portalContext.forceMount, ...contentProps } = props
    const context = useComboboxContext(CONTENT_NAME)

    return (
      <Presence present={forceMount || context.open}>
        <ComboboxContentImpl
          {...contentProps}
          ref={forwardedRef}
          onPointerDown={(event) => event.preventDefault()}
        />
      </Presence>
    )
  },
)

type Boundary = Element | null

type DismissableLayerProps = React.ComponentPropsWithoutRef<typeof DismissableLayer>
type ComboboxContentImplElement = React.ElementRef<typeof Primitive.div>
type PrimitiveDivProps = React.ComponentPropsWithoutRef<typeof Primitive.div>
interface ComboboxContentImplProps
  extends PrimitiveDivProps,
    Omit<DismissableLayerProps, 'onDismiss' | 'disableOutsidePointerEvents'> {
  overlap?: boolean
  side?: Side
  sideOffset?: number
  align?: Align
  alignOffset?: number
  arrowPadding?: number
  collisionBoundary?: Boundary | Boundary[]
  collisionPadding?: number | Partial<Record<Side, number>>
  sticky?: 'partial' | 'always'
  hideWhenDetached?: boolean
  avoidColissions?: boolean
  modal?: boolean
}

const ComboboxContentImpl = React.forwardRef<ComboboxContentImplElement, ComboboxContentImplProps>(
  (props, forwardedRef) => {
    const {
      overlap = false,
      side = 'bottom',
      sideOffset = 0,
      align = 'center',
      alignOffset = 0,
      arrowPadding = 0,
      collisionBoundary = [],
      collisionPadding: collisionPaddingProp = 0,
      sticky = 'partial',
      hideWhenDetached = false,
      avoidColissions = true,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      modal = false,
      ...contentProps
    } = props
    const context = useComboboxContext(CONTENT_NAME)
    const [content, setContent] = React.useState<ComboboxContentImplElement | null>(null)
    const composedRefs = useComposedRefs(forwardedRef, (node) => setContent(node))

    const [arrow, setArrow] = React.useState<HTMLSpanElement | null>(null)
    const arrowSize = useSize(arrow)
    const arrowWidth = arrowSize?.width ?? 0
    const arrowHeight = arrowSize?.height ?? 0

    const desiredPlacement = (side + (align !== 'center' ? '-' + align : '')) as Placement

    const collisionPadding =
      typeof collisionPaddingProp === 'number'
        ? collisionPaddingProp
        : { top: 0, right: 0, bottom: 0, left: 0, ...collisionPaddingProp }

    const boundary = Array.isArray(collisionBoundary) ? collisionBoundary : [collisionBoundary]

    const detectOverflowOptions = {
      padding: collisionPadding,
      boundary: boundary.filter(isNotNull),
      // with `strategy: 'fixed'`, this is the only way to get it to respect boundaries
      // altBoundary: hasExplicitBoundaries,
    }

    const { refs, placement, floatingStyles, middlewareData, isPositioned } = useFloating({
      placement: desiredPlacement,
      whileElementsMounted: autoUpdate,
      elements: { reference: context.trigger },
      middleware: [
        offset(({ rects }) => {
          const mainAxis = overlap
            ? -rects.reference.height - sideOffset + arrowHeight
            : sideOffset + arrowHeight
          return {
            mainAxis,
            alignmentAxis: alignOffset,
          }
        }),
        avoidColissions &&
          shift({
            mainAxis: true,
            crossAxis: false,
            limiter: sticky === 'partial' ? limitShift() : undefined,
            ...detectOverflowOptions,
          }),
        avoidColissions && flip(detectOverflowOptions),
        size({
          ...detectOverflowOptions,
          apply({ elements, rects, availableWidth, availableHeight }) {
            const { width: anchorWidth, height: anchorHeight } = rects.reference
            const contentStyle = elements.floating.style
            contentStyle.setProperty('--combobox-content-available-width', `${availableWidth}px`)
            contentStyle.setProperty('--combobox-content-available-height', `${availableHeight}px`)
            contentStyle.setProperty('--combobox-trigger-width', `${anchorWidth}px`)
            contentStyle.setProperty('--combobox-trigger-height', `${anchorHeight}px`)
          },
        }),
        arrow && floatingUIArrow({ element: arrow, padding: arrowPadding }),
        transformOrigin({ arrowWidth, arrowHeight }),
        hideWhenDetached && hide({ strategy: 'referenceHidden', ...detectOverflowOptions }),
      ],
    })

    const arrowX = middlewareData.arrow?.x
    const arrowY = middlewareData.arrow?.y
    const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0

    const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement)

    const [contentZIndex, setContentZIndex] = React.useState<string>()
    useLayoutEffect(() => {
      if (content) setContentZIndex(window.getComputedStyle(content).zIndex)
    }, [content])

    const hasPointerDownOutsideRef = React.useRef(false)

    const ScrollLock = modal ? RemoveScroll : React.Fragment
    const scrollLockProps = modal ? { as: Slot, allowPinchZoom: true } : undefined

    return (
      <ScrollLock {...scrollLockProps}>
        <DismissableLayer
          asChild
          disableOutsidePointerEvents={modal}
          onInteractOutside={(event) => {
            onInteractOutside?.(event)

            if (!event.defaultPrevented && event.detail.originalEvent.type === 'pointerdown') {
              hasPointerDownOutsideRef.current = true
            }

            // Prevent dismissing when clicking the trigger.
            // As the trigger is already setup to close, without doing so would
            // cause it to close and immediately open.
            const target = event.target as HTMLElement
            const targetIsTrigger = context.trigger?.contains(target)
            if (targetIsTrigger) event.preventDefault()

            // On Safari if the trigger is inside a container with tabIndex={0}, when clicked
            // we will get the pointer down outside event on the trigger, but then a subsequent
            // focus outside event on the container, we ignore any focus outside event when we've
            // already had a pointer down outside event.
            if (event.detail.originalEvent.type === 'focusin' && hasPointerDownOutsideRef.current) {
              event.preventDefault()
            }
          }}
          onEscapeKeyDown={onEscapeKeyDown}
          onPointerDownOutside={onPointerDownOutside}
          onFocusOutside={onFocusOutside}
          onDismiss={context.onClose}
        >
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              zIndex: contentZIndex,
              ['--radix-popper-transform-origin' as any]: [
                middlewareData.transformOrigin?.x,
                middlewareData.transformOrigin?.y,
              ].join(' '),
            }}
            dir={props.dir}
          >
            <ComboboxContentContextProvider
              placedSide={placedSide}
              onArrowChange={setArrow}
              arrowX={arrowX}
              arrowY={arrowY}
              shouldHideArrow={cannotCenterArrow}
            >
              <Command.List
                data-state={context.open ? 'open' : 'closed'}
                data-side={placedSide}
                data-align={placedAlign}
                {...contentProps}
                ref={composedRefs}
                style={{
                  ...contentProps.style,
                  animation: !isPositioned ? 'none' : undefined,
                  opacity: middlewareData.hide?.referenceHidden ? 0 : undefined,
                }}
              />
            </ComboboxContentContextProvider>
          </div>
        </DismissableLayer>
      </ScrollLock>
    )
  },
)

ComboboxContent.displayName = CONTENT_NAME

/* -------------------------------------------------------------------------------------------------
 * ComboboxArrow
 * -----------------------------------------------------------------------------------------------*/

const ARROW_NAME = 'ComboboxArrow'

const OPPOSITE_SIDE: Record<Side, Side> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
}

type ComboboxArrowElement = React.ElementRef<typeof ArrowPrimitive.Root>
type ArrowProps = React.ComponentPropsWithoutRef<typeof ArrowPrimitive.Root>
interface ComboboxArrowProps extends ArrowProps {}

const ComboboxArrow = React.forwardRef<ComboboxArrowElement, ComboboxArrowProps>(
  (props, forwardedRef) => {
    const contentContext = useComboboxContentContext(ARROW_NAME)
    const baseSide = OPPOSITE_SIDE[contentContext.placedSide]

    return (
      // we have to use an extra wrapper because `ResizeObserver` (used by `useSize`)
      // doesn't report size as we'd expect on SVG elements.
      // it reports their bounding box which is effectively the largest path inside the SVG.
      <span
        ref={contentContext.onArrowChange}
        style={{
          position: 'absolute',
          left: contentContext.arrowX,
          top: contentContext.arrowY,
          [baseSide]: 0,
          transformOrigin: {
            top: '',
            right: '0 0',
            bottom: 'center 0',
            left: '100% 0',
          }[contentContext.placedSide],
          transform: {
            top: 'translateY(100%)',
            right: 'translateY(50%) rotate(90deg) translateX(-50%)',
            bottom: `rotate(180deg)`,
            left: 'translateY(50%) rotate(-90deg) translateX(50%)',
          }[contentContext.placedSide],
          visibility: contentContext.shouldHideArrow ? 'hidden' : undefined,
        }}
      >
        <ArrowPrimitive.Root
          {...props}
          ref={forwardedRef}
          style={{
            ...props.style,
            // ensures the element can be measured correctly (mostly for if SVG)
            display: 'block',
          }}
        />
      </span>
    )
  },
)

ComboboxArrow.displayName = ARROW_NAME

/* -------------------------------------------------------------------------------------------------
 * ComboboxItem
 * -----------------------------------------------------------------------------------------------*/

const ITEM_NAME = 'ComboboxItem'

type ComboboxItemElement = React.ElementRef<typeof Primitive.div>
type ComboboxItemProps = React.ComponentPropsWithoutRef<typeof Command.Item>

const ComboboxItem = React.forwardRef<ComboboxItemElement, ComboboxItemProps>(
  (props, forwardedRef) => {
    const context = useComboboxContext(ITEM_NAME)
    return (
      <Command.Item
        {...props}
        ref={forwardedRef}
        onSelect={(event, value, textContent, id) => {
          props.onSelect?.(event, value, textContent, id)
          if (event.defaultPrevented) return
          context.onSelectedChange(id)
          context.onInputChange(textContent)
          context.onClose()
        }}
      />
    )
  },
)

ComboboxItem.displayName = ITEM_NAME

/* -------------------------------------------------------------------------------------------------
 * ComboboxOpen
 * -----------------------------------------------------------------------------------------------*/

const OPEN_NAME = 'ComboboxOpen'

type ComboboxOpenElement = React.ElementRef<typeof Primitive.button>
type ComboboxOpenProps = React.ComponentPropsWithoutRef<typeof Primitive.button>

const ComboboxOpen = React.forwardRef<ComboboxOpenElement, ComboboxOpenProps>(
  (props, forwardedRef) => {
    const context = useComboboxContext(OPEN_NAME)
    return (
      <Primitive.button
        data-state={context.open ? 'open' : 'closed'}
        {...props}
        ref={forwardedRef}
        onPointerUp={(event) => {
          props.onPointerUp?.(event)
          if (event.pointerType !== 'touch') return
          context.onOpenToggle()
        }}
        onPointerDown={(event) => {
          props.onPointerDown?.(event)
          if (event.pointerType === 'touch') return
          context.onOpenToggle()
        }}
      />
    )
  },
)

ComboboxOpen.displayName = OPEN_NAME

/* -------------------------------------------------------------------------------------------------
 * ComboboxClear
 * -----------------------------------------------------------------------------------------------*/

const CLEAR_NAME = 'ComboboxClear'

type ComboboxClearElement = React.ElementRef<typeof Primitive.button>
type ComboboxClearProps = React.ComponentPropsWithoutRef<typeof Primitive.button>

const ComboboxClear = React.forwardRef<ComboboxClearElement, ComboboxClearProps>(
  (props, forwardedRef) => {
    const context = useComboboxContext(OPEN_NAME)
    return (
      <Primitive.button
        data-value={context.input ? '' : undefined}
        {...props}
        ref={forwardedRef}
        onClick={(event) => {
          props.onClick?.(event)
          context.onInputChange('')
        }}
      />
    )
  },
)

ComboboxClear.displayName = CLEAR_NAME

/* -----------------------------------------------------------------------------------------------*/

function isNotNull<T>(value: T | null): value is T {
  return value !== null
}

function getSideAndAlignFromPlacement(placement: Placement) {
  const [side, align = 'center'] = placement.split('-')
  return [side as Side, align as Align] as const
}

const transformOrigin = (options: { arrowWidth: number; arrowHeight: number }): Middleware => ({
  name: 'transformOrigin',
  options,
  fn(data) {
    const { placement, rects, middlewareData } = data

    const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0
    const isArrowHidden = cannotCenterArrow
    const arrowWidth = isArrowHidden ? 0 : options.arrowWidth
    const arrowHeight = isArrowHidden ? 0 : options.arrowHeight

    const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement)
    const noArrowAlign = { start: '0%', center: '50%', end: '100%' }[placedAlign]

    const arrowXCenter = (middlewareData.arrow?.x ?? 0) + arrowWidth / 2
    const arrowYCenter = (middlewareData.arrow?.y ?? 0) + arrowHeight / 2

    let x = ''
    let y = ''

    if (placedSide === 'bottom') {
      x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`
      y = `${-arrowHeight}px`
    } else if (placedSide === 'top') {
      x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`
      y = `${rects.floating.height + arrowHeight}px`
    } else if (placedSide === 'right') {
      x = `${-arrowHeight}px`
      y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`
    } else if (placedSide === 'left') {
      x = `${rects.floating.width + arrowHeight}px`
      y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`
    }
    return { data: { x, y } }
  },
})

const Group = Command.Group
const Empty = Command.Empty
const Separator = Command.Separator
const Loading = Command.Loading

export {
  Combobox as Root,
  ComboboxAnchor as Anchor,
  ComboboxInput as Input,
  ComboboxPortal as Portal,
  ComboboxContent as Content,
  ComboboxArrow as Arrow,
  ComboboxItem as Item,
  ComboboxOpen as Open,
  ComboboxClear as Clear,
  Group,
  Empty,
  Separator,
  Loading,
  useCommandState,
}
