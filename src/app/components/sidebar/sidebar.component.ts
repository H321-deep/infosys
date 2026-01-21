import { Component, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() userName = '';
  @Input() isAdmin = false;
  
  showThemeMenu = false;
  isCollapsed = false;
  isMobileOpen = false;
  
  constructor(public themeService: ThemeService) {}
  
  toggleThemeMenu(): void {
    this.showThemeMenu = !this.showThemeMenu;
  }

  toggleSidebar(): void {
    if (window.innerWidth <= 768) {
      this.isMobileOpen = !this.isMobileOpen;
      return;
    }
    this.isCollapsed = !this.isCollapsed;
    document.body.classList.toggle('sidebar-collapsed', this.isCollapsed);
  }
  
  selectTheme(theme: 'blue' | 'green' | 'purple' | 'orange' | 'dark'): void {
    this.themeService.setTheme(theme);
    this.showThemeMenu = false;
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.theme-selector')) {
      this.showThemeMenu = false;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (window.innerWidth > 768) {
      this.isMobileOpen = false;
    }
  }
}

