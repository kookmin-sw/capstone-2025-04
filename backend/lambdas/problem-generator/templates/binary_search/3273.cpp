// BOJ - 3273 두 수의 합

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    // two pointer
    int n; cin >> n;
    int arr[n]; LOOP(i, 0, n) cin >> arr[i];
    sort(arr, arr + n);
    int x; cin >> x;

    int l = 0, r = n - 1, cnt = 0;
    while(l < r) {
        int lrs = arr[l] + arr[r];
        if(lrs == x) { cnt++; l++; }
        else if(lrs < x) l++;
        else if(lrs > x) r--;
    }

    cout << cnt << '\n';

}