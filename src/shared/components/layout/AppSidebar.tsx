"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { Package, Truck, LayoutDashboard, Settings, DollarSign, Users, HelpCircle, FileText, Notebook, Receipt, Building, CalendarRange, CheckSquare, Calendar } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/shared/components/ui/sidebar"

// Navigation items structured by module
const navItems = [
  {
    title: "Přehled",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Moje úkoly", url: "/planovani/ukoly", icon: CheckSquare },
      { title: "Kalendář", url: "/planovani/kalendar", icon: Calendar },
      { title: "Projekty & Plány", url: "/planovani", icon: CalendarRange },
      { title: "Struktura firmy", url: "/planovani/struktura", icon: Building },
      { title: "Poznámky", url: "/poznamky", icon: Notebook },
    ],
  },
  {
    title: "Sklad a Katalog",
    items: [
      { title: "Produkty", url: "/produkty", icon: Package },
      { title: "Zásoby a Šarže", url: "/sklad", icon: Truck },
    ],
  },
  {
    title: "Obchod a Nákup",
    items: [
      { title: "Dodavatelé", url: "/dodavatele", icon: Users },
      { title: "Zákazníci", url: "/zakaznici", icon: Users },
      { title: "Vydané doklady (Prodej)", url: "/faktury", icon: Receipt },
      { title: "Přijaté doklady (Nákup)", url: "/faktury/nakup", icon: Receipt },
      { title: "Cenotvorba", url: "/finance", icon: DollarSign },
      { title: "Katalogy a Ceníky", url: "/katalogy", icon: FileText },
    ],
  },
  {
    title: "Správa",
    items: [
      { title: "Nastavení firmy", url: "/nastaveni/firma", icon: Building },
      { title: "Uživatelé a Tým", url: "/nastaveni/uzivatele", icon: Users },
      { title: "Manuál & Nápověda", url: "/manual", icon: HelpCircle },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-zinc-200 dark:border-zinc-800">
      <SidebarHeader className="h-16 flex items-center px-6 justify-start border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Image 
            src="/brand/logo.png" 
            alt="AZ Composite Logo" 
            width={32} 
            height={32} 
            className="rounded-sm"
          />
          <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50">
            AZ Composite
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        {navItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.url || (
                    item.url !== "/" &&
                    pathname.startsWith(item.url) &&
                    (item.url !== "/faktury" || !pathname.startsWith("/faktury/nakup"))
                  )
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton isActive={isActive} tooltip={item.title} render={<Link href={item.url} />}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
