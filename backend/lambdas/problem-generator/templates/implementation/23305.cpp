// BOJ - 23305 수강변경

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXN 1000001
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n, res = 0; cin >> n; int arr[MAXN] = {0, };
    loop(i, 1, n) { int k; cin >> k; arr[k]++; }
    loop(i, 1, n) { int k; cin >> k;
        if(arr[k]) arr[k]--; else res++;    
    }

    cout << res << '\n';
}